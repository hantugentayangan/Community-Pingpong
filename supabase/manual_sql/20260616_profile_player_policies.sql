-- Manual SQL for Community-Pingpong profile/player sync.
-- Jalankan manual di Supabase SQL Editor jika register/login gagal membuat profiles
-- atau jika duplicate NIK belum terblokir oleh database.

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

-- 2) Keep NIK/KTP unique at database level.
create unique index if not exists players_identity_number_unique
  on public.players (identity_number)
  where identity_number is not null and identity_number <> '';

-- 3) Public can read only approved and active players.
-- This supports the public Players page without exposing pending/inactive rows.
do $$
begin
  if not exists (
    select 1
    from pg_policies
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
        and coalesce(profile_status, 'active') = 'active'
      );
  end if;
end $$;
