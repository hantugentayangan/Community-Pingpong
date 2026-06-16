-- Community-Pingpong: actual schema fix for profiles, players, ads, and news.
-- Jalankan manual di Supabase SQL Editor.
-- Non-destructive: tidak drop table, tidak delete data, dan tidak memakai field lama.
--
-- Actual schema only:
-- profiles.status, players.user_id, players.status, ads.created_by, ads.advertiser_name.

-- 1) Helper admin berdasarkan public.profiles.role.
-- Fungsi ini dipakai policy agar admin/superadmin bisa membaca dan mengelola data.
create or replace function public.is_community_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(replace(coalesce(p.role, ''), '-', '_')) in ('admin', 'super_admin', 'superadmin')
  )
$$;

revoke all on function public.is_community_admin() from public;
grant execute on function public.is_community_admin() to authenticated;

-- 2) Helper validasi NIK untuk frontend.
-- Frontend memakai fungsi ini agar register/profile dapat menolak NIK duplikat sebelum save.
create or replace function public.check_identity_number_conflict(input_identity text)
returns table (
  is_duplicate boolean,
  belongs_to_current_user boolean,
  profile_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select nullif(regexp_replace(coalesce(input_identity, ''), '\D', '', 'g'), '') as identity_value
  ),
  matched_profile as (
    select p.id
    from public.profiles p
    join normalized n on p.identity_number = n.identity_value
    limit 1
  )
  select
    exists(select 1 from matched_profile) as is_duplicate,
    exists(select 1 from matched_profile where id = auth.uid()) as belongs_to_current_user,
    (select id from matched_profile limit 1) as profile_id
$$;

revoke all on function public.check_identity_number_conflict(text) from public;
grant execute on function public.check_identity_number_conflict(text) to anon, authenticated;

-- 3) Backfill profiles dari auth.users.
-- NIK/KTP tetap harus unik. Jika metadata auth berisi NIK yang sudah dipakai profile lain,
-- akun tersebut dibuat tanpa identity_number dan diberi status pending_duplicate untuk review admin.
-- Constraint profiles_identity_number_unique tetap menjadi proteksi produksi dan tidak boleh di-drop.
with auth_source as (
  select
    u.id,
    u.email,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(u.raw_user_meta_data->>'name'), ''),
      split_part(u.email, '@', 1)
    ) as full_name,
    coalesce(nullif(trim(u.raw_user_meta_data->>'role'), ''), 'member') as role,
    coalesce(nullif(trim(u.raw_user_meta_data->>'status'), ''), 'pending') as status,
    coalesce(u.created_at, now()) as created_at,
    nullif(trim(u.raw_user_meta_data->>'phone'), '') as phone,
    nullif(regexp_replace(coalesce(u.raw_user_meta_data->>'identity_number', u.raw_user_meta_data->>'ktp_nik', ''), '\D', '', 'g'), '') as identity_candidate,
    case
      when coalesce(u.raw_user_meta_data->>'birth_date', '') ~ '^\d{4}-\d{2}-\d{2}$'
        then (u.raw_user_meta_data->>'birth_date')::date
      else null
    end as birth_date,
    nullif(trim(u.raw_user_meta_data->>'division'), '') as division,
    nullif(trim(u.raw_user_meta_data->>'avatar_url'), '') as avatar_url,
    coalesce(nullif(trim(u.raw_user_meta_data->>'avatar_position'), ''), 'center center') as avatar_position
  from auth.users u
),
prepared as (
  select
    ranked.*,
    exists (
      select 1
      from public.profiles p
      where p.identity_number = ranked.identity_candidate
        and p.id <> ranked.id
    )
    or (
      ranked.identity_candidate is not null
      and ranked.identity_rank > 1
    ) as identity_used_by_other
  from (
    select
      s.*,
      row_number() over (
        partition by s.identity_candidate
        order by s.created_at asc, s.id asc
      ) as identity_rank
    from auth_source s
  ) ranked
)
insert into public.profiles (
  id,
  email,
  full_name,
  role,
  status,
  created_at,
  updated_at,
  phone,
  identity_number,
  birth_date,
  division,
  avatar_url,
  avatar_position
)
select
  p.id,
  p.email,
  p.full_name,
  p.role,
  case
    when p.identity_candidate is not null and p.identity_used_by_other then 'pending_duplicate'
    else p.status
  end as status,
  p.created_at,
  now() as updated_at,
  p.phone,
  case
    when p.identity_candidate is not null and not p.identity_used_by_other then p.identity_candidate
    else null
  end as identity_number,
  p.birth_date,
  p.division,
  p.avatar_url,
  p.avatar_position
from prepared p
where not exists (
  select 1 from public.profiles existing where existing.id = p.id
);

-- 4) Lengkapi profile existing dari metadata auth tanpa menimpa NIK dengan nilai duplikat.
-- Jika NIK metadata sudah dipakai profile lain, profile existing ditandai pending_duplicate.
with auth_source as (
  select
    u.id,
    coalesce(u.created_at, now()) as created_at,
    nullif(regexp_replace(coalesce(u.raw_user_meta_data->>'identity_number', u.raw_user_meta_data->>'ktp_nik', ''), '\D', '', 'g'), '') as identity_candidate,
    coalesce(nullif(trim(u.raw_user_meta_data->>'status'), ''), 'pending') as metadata_status
  from auth.users u
),
ranked_auth_source as (
  select
    s.*,
    row_number() over (
      partition by s.identity_candidate
      order by s.created_at asc, s.id asc
    ) as identity_rank
  from auth_source s
)
update public.profiles p
set
  identity_number = case
    when p.identity_number is not null then p.identity_number
    when s.identity_candidate is null then p.identity_number
    when s.identity_rank > 1 then p.identity_number
    when exists (
      select 1
      from public.profiles other
      where other.identity_number = s.identity_candidate
        and other.id <> p.id
    ) then p.identity_number
    else s.identity_candidate
  end,
  status = case
    when s.identity_candidate is not null
      and p.identity_number is null
      and (
        s.identity_rank > 1
        or exists (
          select 1
          from public.profiles other
          where other.identity_number = s.identity_candidate
            and other.id <> p.id
        )
      )
      then 'pending_duplicate'
    else coalesce(nullif(p.status, ''), s.metadata_status, 'pending')
  end,
  updated_at = now()
from ranked_auth_source s
where p.id = s.id;

-- 5) Backfill players dari profiles.
-- players.user_id harus berisi UUID profiles.id, bukan email.
-- Backfill player tidak memasukkan identity_number jika nomor itu sudah dipakai player lain.
insert into public.players (
  user_id,
  email,
  full_name,
  phone,
  identity_number,
  birth_date,
  division,
  photo_url,
  status,
  profile_status,
  admin_note,
  created_at,
  updated_at
)
select
  p.id,
  p.email,
  p.full_name,
  p.phone,
  case
    when p.identity_number is not null
      and not exists (
        select 1
        from public.players existing_player
        where existing_player.identity_number = p.identity_number
          and existing_player.user_id <> p.id
      )
      then p.identity_number
    else null
  end as identity_number,
  p.birth_date,
  p.division,
  p.avatar_url,
  case
    when p.status = 'pending_duplicate' then 'pending'
    else coalesce(nullif(p.status, ''), 'pending')
  end as status,
  case
    when p.status = 'pending_duplicate' then 'incomplete'
    else 'complete'
  end as profile_status,
  case
    when p.status = 'pending_duplicate'
      then 'NIK/KTP terindikasi duplikat dari metadata auth. Akun diblokir dari approval otomatis dan perlu review admin.'
    else null
  end as admin_note,
  coalesce(p.created_at, now()) as created_at,
  now() as updated_at
from public.profiles p
where not exists (
  select 1 from public.players pl where pl.user_id = p.id
);

-- 6) RLS profiles: owner can manage own row; admin/superadmin can manage all.
alter table public.profiles enable row level security;

drop policy if exists "profiles own select actual schema" on public.profiles;
create policy "profiles own select actual schema"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles public select active ad creators actual schema" on public.profiles;
create policy "profiles public select active ad creators actual schema"
on public.profiles
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.ads a
    where a.created_by = profiles.id
      and a.status = 'active'
  )
);

drop policy if exists "profiles own insert actual schema" on public.profiles;
create policy "profiles own insert actual schema"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles own update actual schema" on public.profiles;
create policy "profiles own update actual schema"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles admin all actual schema" on public.profiles;
create policy "profiles admin all actual schema"
on public.profiles
for all
to authenticated
using (public.is_community_admin())
with check (public.is_community_admin());

-- 7) RLS players: public only sees approved/active rows; owner manages own row; admin manages all.
alter table public.players enable row level security;

drop policy if exists "players public select approved active actual schema" on public.players;
create policy "players public select approved active actual schema"
on public.players
for select
to anon, authenticated
using (status in ('approved', 'active'));

drop policy if exists "players own select actual schema" on public.players;
create policy "players own select actual schema"
on public.players
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "players own insert actual schema" on public.players;
create policy "players own insert actual schema"
on public.players
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "players own update actual schema" on public.players;
create policy "players own update actual schema"
on public.players
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "players admin all actual schema" on public.players;
create policy "players admin all actual schema"
on public.players
for all
to authenticated
using (public.is_community_admin())
with check (public.is_community_admin());

-- 8) RLS ads: public reads active marketplace rows; admin/superadmin writes.
alter table public.ads enable row level security;

drop policy if exists "ads public select active actual schema" on public.ads;
create policy "ads public select active actual schema"
on public.ads
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "ads admin all actual schema" on public.ads;
create policy "ads admin all actual schema"
on public.ads
for all
to authenticated
using (public.is_community_admin())
with check (public.is_community_admin());

-- 9) RLS news: public reads published news; admin/superadmin writes.
alter table public.news enable row level security;

drop policy if exists "news public select published actual schema" on public.news;
create policy "news public select published actual schema"
on public.news
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "news admin all actual schema" on public.news;
create policy "news admin all actual schema"
on public.news
for all
to authenticated
using (public.is_community_admin())
with check (public.is_community_admin());

-- 10) Optional storage policy untuk bucket community-images.
-- Aman untuk app publik: image bisa dibaca publik, user login bisa upload ke bucket ini.
insert into storage.buckets (id, name, public)
values ('community-images', 'community-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "community images public read actual schema" on storage.objects;
create policy "community images public read actual schema"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'community-images');

drop policy if exists "community images authenticated insert actual schema" on storage.objects;
create policy "community images authenticated insert actual schema"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'community-images');
