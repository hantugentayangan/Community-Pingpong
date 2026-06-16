-- Manual SQL for Community-Pingpong profile sync and Supabase Storage uploads.
-- Jalankan di Supabase SQL Editor setelah review.
-- Tidak menghapus data, tidak disable RLS, dan tidak memakai service role di frontend.

-- 1) Authenticated user can create their own profile row.
do $$
begin
  if not exists (
    select 1
    from pg_policies
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

-- 2) Optional image position columns used by the UI.
alter table public.players
  add column if not exists photo_position text default 'center center';

alter table public.ptm
  add column if not exists logo_position text default 'center center',
  add column if not exists activity_photo_position text default 'center center';

alter table public.news
  add column if not exists photo_position text default 'center center';

alter table public.ads
  add column if not exists photo_position text default 'center center';

-- 3) Prevent duplicate player rows for the same user when existing data is clean.
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
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'players_user_id_unique'
  ) then
    execute 'create unique index players_user_id_unique on public.players (user_id) where user_id is not null';
  end if;
end $$;

-- 4) Make player photos publicly readable when the app stores public URLs.
-- Jika Anda ingin foto pemain private, jangan jalankan update bucket ini dan ubah app ke signed URL.
update storage.buckets
set public = true
where id = 'player-photos';

-- 5) Public read policy for app image buckets.
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
      using (bucket_id in ('player-photos', 'ptm-logos', 'news-images', 'ads-images', 'public-assets'));
  end if;
end $$;

-- 6) Users can upload their own avatar and PTM images under a folder named with auth.uid().
-- Current app paths:
--   player-photos/{auth.uid()}/avatars/...
--   ptm-logos/{auth.uid()}/ptm/...
--   ptm-logos/{auth.uid()}/ptm-activities/...
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
        bucket_id in ('player-photos', 'ptm-logos')
        and (storage.foldername(name))[1] = auth.uid()::text
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
        bucket_id in ('player-photos', 'ptm-logos')
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id in ('player-photos', 'ptm-logos')
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

-- 7) Admins can upload/update content images for news and ads.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can upload content images'
  ) then
    create policy "Admins can upload content images"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id in ('news-images', 'ads-images', 'ptm-logos')
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and lower(replace(p.role, '-', '_')) in ('admin', 'super_admin', 'superadmin')
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
      and policyname = 'Admins can update content images'
  ) then
    create policy "Admins can update content images"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id in ('news-images', 'ads-images', 'ptm-logos')
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and lower(replace(p.role, '-', '_')) in ('admin', 'super_admin', 'superadmin')
        )
      )
      with check (
        bucket_id in ('news-images', 'ads-images', 'ptm-logos')
        and exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and lower(replace(p.role, '-', '_')) in ('admin', 'super_admin', 'superadmin')
        )
      );
  end if;
end $$;

-- 8) Supabase Auth URL Configuration manual check:
-- Authentication > URL Configuration
-- Site URL:
--   https://tabletenniscommunity.netlify.app
-- Redirect URLs:
--   http://localhost:5173/**
--   http://localhost:5174/**
--   https://tabletenniscommunity.netlify.app/**
