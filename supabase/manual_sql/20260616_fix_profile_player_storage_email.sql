-- Community-Pingpong critical fix: profile/player sync, admin role, storage image display.
-- Jalankan manual di Supabase SQL Editor.
-- Non-destructive: tidak drop table, tidak delete data, tidak disable RLS.

-- 1) Optional profile fields so register metadata can persist outside auth.users metadata.
alter table public.profiles
  add column if not exists identity_number text,
  add column if not exists birth_date date,
  add column if not exists division text,
  add column if not exists avatar_url text,
  add column if not exists avatar_position text default 'center center';

alter table public.players
  add column if not exists photo_position text default 'center center';

alter table public.ptm
  add column if not exists logo_position text default 'center center',
  add column if not exists activity_photo_position text default 'center center';

alter table public.news
  add column if not exists photo_position text default 'center center';

alter table public.ads
  add column if not exists photo_position text default 'center center';

-- 2) Admin helper used by existing RLS policies.
-- Previous function required status = approved, while the app uses active for profiles.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and lower(replace(coalesce(role, ''), '-', '_')) in ('admin', 'super_admin', 'superadmin')
      and lower(coalesce(status, 'active')) in ('active', 'approved')
  )
$$;

-- Optional normalization: production keeps frontend support for both variants,
-- but storing superadmin consistently prevents stale UI/RLS mismatches.
update public.profiles
set role = 'superadmin'
where lower(replace(trim(coalesce(role, '')), '-', '_')) = 'super_admin';

-- 3) Profiles RLS: authenticated users can create/read/update their own basic profile.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can insert own profile'
  ) then
    create policy "Users can insert own profile"
      on public.profiles
      for insert
      to authenticated
      with check (id = auth.uid());
  end if;
end $$;

-- 4) Players owner policies aligned with players.user_id -> profiles.id -> auth.users.id.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'players'
      and policyname = 'Public can read approved active players'
  ) then
    create policy "Public can read approved active players"
      on public.players
      for select
      to anon, authenticated
      using (
        status = 'approved'
        and lower(coalesce(profile_status, 'active')) in ('active', 'aktif')
      );
  end if;
end $$;

-- 5) Public PTM read should hide inactive PTM.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ptm'
      and policyname = 'Public can read approved active PTM'
  ) then
    create policy "Public can read approved active PTM"
      on public.ptm
      for select
      to anon, authenticated
      using (
        status = 'approved'
        and lower(coalesce(ptm_status, 'active')) in ('active', 'aktif')
      );
  end if;
end $$;

-- 6) Unique indexes if existing data is clean.
do $$
begin
  if exists (
    select user_id
    from public.players
    where user_id is not null
    group by user_id
    having count(*) > 1
  ) then
    raise notice 'Skipped players_user_id_unique because duplicate user_id rows exist. Clean duplicates first.';
  elsif not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'players_user_id_unique'
  ) then
    execute 'create unique index players_user_id_unique on public.players (user_id) where user_id is not null';
  end if;

  if exists (
    select identity_number
    from public.players
    where identity_number is not null and identity_number <> ''
    group by identity_number
    having count(*) > 1
  ) then
    raise notice 'Skipped players_identity_number_unique because duplicate identity_number rows exist. Clean duplicates first.';
  elsif not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'players_identity_number_unique'
  ) then
    execute 'create unique index players_identity_number_unique on public.players (identity_number) where identity_number is not null and identity_number <> ''''';
  end if;

  if exists (
    select identity_number
    from public.profiles
    where identity_number is not null and identity_number <> ''
    group by identity_number
    having count(*) > 1
  ) then
    raise notice 'Skipped profiles_identity_number_unique because duplicate identity_number rows exist. Clean duplicates first.';
  elsif not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'profiles_identity_number_unique'
  ) then
    execute 'create unique index profiles_identity_number_unique on public.profiles (identity_number) where identity_number is not null and identity_number <> ''''';
  end if;
end $$;

-- 7) Automatically create/sync profiles and pending players from Supabase Auth metadata.
create schema if not exists private;

create or replace function private.sync_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  full_name_value text;
  phone_value text;
  identity_value text;
  birth_date_value date;
  division_value text;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name_value := nullif(trim(coalesce(meta->>'full_name', meta->>'fullName', '')), '');
  phone_value := nullif(trim(coalesce(meta->>'phone', '')), '');
  identity_value := nullif(regexp_replace(coalesce(meta->>'identity_number', meta->>'nik', ''), '\D', '', 'g'), '');
  division_value := nullif(trim(coalesce(meta->>'division', meta->>'divisi', '')), '');

  begin
    birth_date_value := nullif(coalesce(meta->>'birth_date', meta->>'birthDate', ''), '')::date;
  exception when others then
    birth_date_value := null;
  end;

  insert into public.profiles (
    id, email, full_name, phone, identity_number, birth_date, division, role, status, created_at, updated_at
  )
  values (
    new.id, new.email, full_name_value, phone_value, identity_value, birth_date_value, division_value,
    'member', 'active', now(), now()
  )
  on conflict (id) do update
  set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
    phone = coalesce(nullif(public.profiles.phone, ''), excluded.phone),
    identity_number = coalesce(nullif(public.profiles.identity_number, ''), excluded.identity_number),
    birth_date = coalesce(public.profiles.birth_date, excluded.birth_date),
    division = coalesce(nullif(public.profiles.division, ''), excluded.division),
    role = public.profiles.role,
    status = coalesce(public.profiles.status, 'active'),
    updated_at = now();

  if identity_value is not null or division_value is not null then
    if exists (select 1 from public.players where user_id = new.id) then
      update public.players
      set
        email = coalesce(public.players.email, new.email),
        full_name = coalesce(nullif(public.players.full_name, ''), full_name_value),
        phone = coalesce(nullif(public.players.phone, ''), phone_value),
        identity_number = coalesce(nullif(public.players.identity_number, ''), identity_value),
        birth_date = coalesce(public.players.birth_date, birth_date_value),
        division = coalesce(nullif(public.players.division, ''), division_value),
        ptm_status = coalesce(nullif(public.players.ptm_status, ''), 'Tidak tergabung PTM'),
        profile_status = coalesce(nullif(public.players.profile_status, ''), 'active'),
        updated_at = now()
      where user_id = new.id;
    else
      insert into public.players (
        user_id, email, full_name, phone, identity_number, birth_date, division,
        ptm_status, status, profile_status, created_at, updated_at
      )
      values (
        new.id, new.email, full_name_value, phone_value, identity_value, birth_date_value, division_value,
        'Tidak tergabung PTM', 'pending', 'active', now(), now()
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_community_pingpong on auth.users;
create trigger on_auth_user_created_community_pingpong
  after insert on auth.users
  for each row execute function private.sync_new_auth_user_profile();

-- 8) Audit logs: app writes non-critical audit rows from authenticated client.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'audit_logs'
      and policyname = 'Authenticated users can insert own audit logs'
  ) then
    create policy "Authenticated users can insert own audit logs"
      on public.audit_logs
      for insert
      to authenticated
      with check (actor_id is null or actor_id = auth.uid());
  end if;
end $$;

-- 9) Public community image bucket for avatars, PTM, news, and ads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-images',
  'community-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read community images'
  ) then
    create policy "Public can read community images"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'community-images');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload own community images'
  ) then
    create policy "Users can upload own community images"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'community-images'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or public.is_admin()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update own community images'
  ) then
    create policy "Users can update own community images"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'community-images'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or public.is_admin()
        )
      )
      with check (
        bucket_id = 'community-images'
        and (
          (storage.foldername(name))[1] = auth.uid()::text
          or public.is_admin()
        )
      );
  end if;
end $$;

-- 10) App config keys for notifications.
insert into public.app_config (key, value, is_public, description)
values
  ('ADMIN_NOTIFICATION_EMAIL', '', false, 'Fallback email admin for Netlify notification function'),
  ('SUPERADMIN_EMAILS', '', false, 'Comma-separated superadmin emails')
on conflict (key) do nothing;

-- Manual dashboard settings:
-- Supabase Authentication > URL Configuration
-- Site URL: https://tabletenniscommunity.netlify.app
-- Redirect URLs:
--   http://localhost:5173/**
--   http://localhost:5174/**
--   https://tabletenniscommunity.netlify.app/**
--
-- Netlify environment variables for email notification:
--   RESEND_API_KEY
--   NOTIFICATION_FROM_EMAIL
--   ADMIN_NOTIFICATION_EMAIL
