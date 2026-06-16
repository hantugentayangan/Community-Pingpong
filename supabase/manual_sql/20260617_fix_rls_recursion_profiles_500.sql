-- Community-Pingpong emergency fix: stop profiles RLS recursion / REST 500.
-- Jalankan manual di Supabase SQL Editor.
-- Non-destructive: tidak drop table, tidak drop constraint unique NIK, dan tidak delete data.
--
-- Masalah yang diperbaiki:
-- - Admin page stuck di "Memuat akses admin dari profil..."
-- - REST /profiles?... HTTP 500 karena policy/helper membaca public.profiles saat policy profiles dievaluasi.
--
-- Prinsip:
-- - profiles policy tidak boleh memakai EXISTS/SELECT langsung ke public.profiles.
-- - Role admin dibaca lewat SECURITY DEFINER helper.
-- - Duplicate NIK/KTP tetap tidak dianggap akun valid; status pending_duplicate tetap untuk review admin.

begin;

-- 1) SECURITY DEFINER role helpers.
-- Function ini membaca public.profiles sebagai definer, bukan lewat RLS caller,
-- sehingga aman dipakai oleh policy profiles/players/news/ads/storage.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when lower(trim(coalesce(p.role, ''))) in ('super_admin', 'super-admin', 'superadmin') then 'superadmin'
        when lower(trim(coalesce(p.role, ''))) = 'admin' then 'admin'
        when lower(trim(coalesce(p.role, ''))) = 'member' then 'member'
        when nullif(lower(trim(coalesce(p.role, ''))), '') is not null then lower(trim(p.role))
        else 'member'
      end
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    'member'
  )
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'superadmin')
$$;

create or replace function public.is_superadmin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'superadmin'
$$;

-- Backward-compatible aliases for older policies/files that may still call these names.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_user()
$$;

create or replace function public.is_community_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin_user()
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.is_admin_user() from public;
revoke all on function public.is_superadmin_user() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_community_admin() from public;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_superadmin_user() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_community_admin() to authenticated;

-- 2) Normalize role/status data safely.
-- Frontend tetap support varian lama, tetapi data produksi disimpan konsisten.
update public.profiles
set role = 'superadmin'
where lower(trim(coalesce(role, ''))) in ('super_admin', 'super-admin', 'superadmin');

update public.profiles
set status = 'approved'
where lower(trim(coalesce(email, ''))) in (
  'indtabletenniscommunity@gmail.com',
  'hanturorf1@gmail.com'
)
and lower(trim(coalesce(status, ''))) in ('active', 'approved');

-- 3) Profiles RLS: owner by auth.uid, admin via SECURITY DEFINER helper.
alter table if exists public.profiles enable row level security;

drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "profiles own select actual schema" on public.profiles;
drop policy if exists "profiles public select active ad creators actual schema" on public.profiles;
drop policy if exists "profiles own insert actual schema" on public.profiles;
drop policy if exists "profiles own update actual schema" on public.profiles;
drop policy if exists "profiles admin all actual schema" on public.profiles;
drop policy if exists "profiles owner select no recursion 20260617" on public.profiles;
drop policy if exists "profiles owner insert no recursion 20260617" on public.profiles;
drop policy if exists "profiles owner update no recursion 20260617" on public.profiles;
drop policy if exists "profiles admin all no recursion 20260617" on public.profiles;

create policy "profiles owner select no recursion 20260617"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles owner insert no recursion 20260617"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles owner update no recursion 20260617"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles admin all no recursion 20260617"
on public.profiles
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- 4) Players RLS: public approved/active only, owner own row, admin all.
-- Duplicate NIK/KTP account is not accepted as approved data.
-- If duplicate account exists, profile.status remains pending_duplicate for admin review,
-- while players.status must stay pending/incomplete-compatible and never pending_duplicate.
alter table if exists public.players enable row level security;

drop policy if exists "Public can read approved active players" on public.players;
drop policy if exists "Users can read own player" on public.players;
drop policy if exists "Users can insert own player" on public.players;
drop policy if exists "Users can update own player" on public.players;
drop policy if exists "players public select approved active actual schema" on public.players;
drop policy if exists "players own select actual schema" on public.players;
drop policy if exists "players own insert actual schema" on public.players;
drop policy if exists "players own update actual schema" on public.players;
drop policy if exists "players admin all actual schema" on public.players;
drop policy if exists "players public select approved active 20260617" on public.players;
drop policy if exists "players owner select 20260617" on public.players;
drop policy if exists "players owner insert 20260617" on public.players;
drop policy if exists "players owner update 20260617" on public.players;
drop policy if exists "players admin all 20260617" on public.players;

create policy "players public select approved active 20260617"
on public.players
for select
to anon, authenticated
using (
  lower(trim(coalesce(status, ''))) in ('approved', 'active')
);

create policy "players owner select 20260617"
on public.players
for select
to authenticated
using (user_id = auth.uid());

create policy "players owner insert 20260617"
on public.players
for insert
to authenticated
with check (user_id = auth.uid());

create policy "players owner update 20260617"
on public.players
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "players admin all 20260617"
on public.players
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- 5) PTM RLS: public approved/active only, owner by created_by, admin all.
-- Kept here because Admin Console loads PTM together with profiles/players.
alter table if exists public.ptm enable row level security;

drop policy if exists "Public can read approved active PTM" on public.ptm;
drop policy if exists "ptm public select approved active 20260617" on public.ptm;
drop policy if exists "ptm owner select 20260617" on public.ptm;
drop policy if exists "ptm owner insert 20260617" on public.ptm;
drop policy if exists "ptm owner update 20260617" on public.ptm;
drop policy if exists "ptm admin all 20260617" on public.ptm;

create policy "ptm public select approved active 20260617"
on public.ptm
for select
to anon, authenticated
using (
  lower(trim(coalesce(status, ''))) in ('approved', 'active')
  and lower(trim(coalesce(ptm_status, 'active'))) in ('active', 'aktif', 'approved')
);

create policy "ptm owner select 20260617"
on public.ptm
for select
to authenticated
using (created_by = auth.uid());

create policy "ptm owner insert 20260617"
on public.ptm
for insert
to authenticated
with check (created_by = auth.uid());

create policy "ptm owner update 20260617"
on public.ptm
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "ptm admin all 20260617"
on public.ptm
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- 6) Ads/news RLS: public reads published/active, admin all.
alter table if exists public.ads enable row level security;

drop policy if exists "ads public select active actual schema" on public.ads;
drop policy if exists "ads admin all actual schema" on public.ads;
drop policy if exists "ads public select active 20260617" on public.ads;
drop policy if exists "ads admin all 20260617" on public.ads;

create policy "ads public select active 20260617"
on public.ads
for select
to anon, authenticated
using (lower(trim(coalesce(status, ''))) in ('active', 'published'));

create policy "ads admin all 20260617"
on public.ads
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

alter table if exists public.news enable row level security;

drop policy if exists "news public select published actual schema" on public.news;
drop policy if exists "news admin all actual schema" on public.news;
drop policy if exists "news public select published 20260617" on public.news;
drop policy if exists "news admin all 20260617" on public.news;

create policy "news public select published 20260617"
on public.news
for select
to anon, authenticated
using (lower(trim(coalesce(status, ''))) = 'published');

create policy "news admin all 20260617"
on public.news
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- 7) Storage RLS: remove older direct public.profiles lookups in storage policies.
-- Public image read stays open; authenticated owner/admin upload stays protected.
update storage.buckets
set public = true
where id in ('community-images', 'player-photos', 'ptm-logos', 'news-images', 'ads-images', 'public-assets');

drop policy if exists "Public can read community images" on storage.objects;
drop policy if exists "Users can upload own community images" on storage.objects;
drop policy if exists "Users can update own community images" on storage.objects;
drop policy if exists "Admins can upload content images" on storage.objects;
drop policy if exists "Admins can update content images" on storage.objects;
drop policy if exists "community images public read actual schema" on storage.objects;
drop policy if exists "community images authenticated insert actual schema" on storage.objects;
drop policy if exists "storage public image read 20260617" on storage.objects;
drop policy if exists "storage authenticated image insert 20260617" on storage.objects;
drop policy if exists "storage authenticated image update 20260617" on storage.objects;

create policy "storage public image read 20260617"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id in ('community-images', 'player-photos', 'ptm-logos', 'news-images', 'ads-images', 'public-assets')
);

create policy "storage authenticated image insert 20260617"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('community-images', 'player-photos', 'ptm-logos', 'news-images', 'ads-images', 'public-assets')
  and (
    public.is_admin_user()
    or (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[2] = auth.uid()::text
  )
);

create policy "storage authenticated image update 20260617"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('community-images', 'player-photos', 'ptm-logos', 'news-images', 'ads-images', 'public-assets')
  and (
    public.is_admin_user()
    or (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[2] = auth.uid()::text
  )
)
with check (
  bucket_id in ('community-images', 'player-photos', 'ptm-logos', 'news-images', 'ads-images', 'public-assets')
  and (
    public.is_admin_user()
    or (storage.foldername(name))[1] = auth.uid()::text
    or (storage.foldername(name))[2] = auth.uid()::text
  )
);

commit;

-- Verification queries setelah run:
-- 1) Pastikan policy profiles tidak membaca public.profiles langsung:
-- select policyname, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'profiles'
--   and (coalesce(qual, '') ilike '%public.profiles%' or coalesce(with_check, '') ilike '%public.profiles%');
--
-- Expected: 0 rows.
--
-- 2) Pastikan helper role bekerja untuk user login:
-- select public.current_user_role(), public.is_admin_user(), public.is_superadmin_user();
--
-- 3) Pastikan tidak ada player status pending_duplicate:
-- select id, email, status, profile_status, admin_note
-- from public.players
-- where status = 'pending_duplicate';
--
-- Expected: 0 rows.
--
-- 4) Cek profile admin/superadmin:
-- select id, email, role, status
-- from public.profiles
-- where lower(email) in ('indtabletenniscommunity@gmail.com', 'hanturorf1@gmail.com');
