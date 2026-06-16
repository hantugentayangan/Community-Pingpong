-- Community-Pingpong final narrow fix: public.profiles REST 500 / RLS recursion only.
-- Jalankan manual di Supabase SQL Editor.
--
-- Scope file ini sengaja sempit:
-- - helper role/status untuk admin check
-- - drop semua policy lama pada public.profiles secara dinamis
-- - recreate policy public.profiles yang non-recursive
--
-- Tidak menyentuh:
-- - players/ads/news/ptm/storage policies
-- - schema table/kolom
-- - identity_number unique constraint
-- - bucket strategy
--
-- Kenapa perlu file ini:
-- REST /profiles?... bisa 500 jika policy pada public.profiles membaca public.profiles
-- secara langsung, misalnya EXISTS (SELECT ... FROM public.profiles ...).
-- Policy di bawah tidak membaca public.profiles langsung; admin check hanya lewat
-- SECURITY DEFINER helper.

begin;

-- 1) Helper functions untuk admin check.
-- Catatan keamanan: function tetap di public karena app/RLS existing memakai public.*,
-- tetapi execute untuk PUBLIC dicabut dan hanya diberikan ke authenticated.
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
        when lower(trim(coalesce(role, ''))) in ('super_admin', 'super-admin', 'superadmin') then 'superadmin'
        when lower(trim(coalesce(role, ''))) = 'admin' then 'admin'
        when lower(trim(coalesce(role, ''))) = 'member' then 'member'
        when nullif(lower(trim(coalesce(role, ''))), '') is not null then lower(trim(role))
        else 'member'
      end
      from public.profiles
      where id = auth.uid()
      limit 1
    ),
    'member'
  )
$$;

create or replace function public.current_user_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when lower(trim(coalesce(status, ''))) in ('active', 'approved') then 'approved'
        when lower(trim(coalesce(status, ''))) = 'rejected' then 'rejected'
        when lower(trim(coalesce(status, ''))) = 'pending_duplicate' then 'pending_duplicate'
        when lower(trim(coalesce(status, ''))) = 'pending' then 'pending'
        when nullif(lower(trim(coalesce(status, ''))), '') is not null then lower(trim(status))
        else 'pending'
      end
      from public.profiles
      where id = auth.uid()
      limit 1
    ),
    'pending'
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
    and public.current_user_status() not in ('rejected', 'pending_duplicate')
$$;

create or replace function public.is_superadmin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'superadmin'
    and public.current_user_status() not in ('rejected', 'pending_duplicate')
$$;

-- Compatibility aliases: repo SQL lama memakai public.is_admin() dan public.is_community_admin().
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
revoke all on function public.current_user_status() from public;
revoke all on function public.is_admin_user() from public;
revoke all on function public.is_superadmin_user() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_community_admin() from public;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_status() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_superadmin_user() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_community_admin() to authenticated;

-- 2) Safe role/status normalization for known admin accounts.
update public.profiles
set role = 'superadmin'
where lower(trim(coalesce(role, ''))) in ('super_admin', 'super-admin');

update public.profiles
set status = 'approved'
where lower(trim(coalesce(email, ''))) in (
  'indtabletenniscommunity@gmail.com',
  'hanturorf1@gmail.com'
)
and lower(trim(coalesce(status, ''))) in ('active', 'approved');

-- 3) Drop ALL existing profiles policies by actual names in database.
alter table public.profiles enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- 4) Recreate clean non-recursive public.profiles policies only.
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_admin_select_all
on public.profiles
for select
to authenticated
using (public.is_admin_user());

create policy profiles_admin_update_all
on public.profiles
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

commit;

-- Verify profiles policies:
-- select policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'profiles'
-- order by policyname;
--
-- Verify admin profiles:
-- select id, email, role, status
-- from public.profiles
-- where email in ('indtabletenniscommunity@gmail.com','hanturorf1@gmail.com');
--
-- Verify helper functions:
-- select public.current_user_role();
-- select public.current_user_status();
-- select public.is_admin_user();
