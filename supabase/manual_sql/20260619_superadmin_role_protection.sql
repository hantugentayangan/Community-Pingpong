-- Community-Pingpong Batch 5A: Superadmin role protection.
-- Jalankan manual di Supabase SQL Editor.
--
-- Tujuan keamanan:
-- - hanya superadmin yang boleh mengelola role user.
-- - admin biasa tidak boleh promosi/demosi role user.
-- - superadmin tidak boleh mengubah role dirinya sendiri.
-- - superadmin terakhir tidak boleh dihapus/didemosi.
-- - role, user_id, dan field profile lain tidak diubah oleh RPC ini.

begin;

create or replace function public.is_app_superadmin()
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
      and lower(trim(coalesce(p.role, ''))) = 'superadmin'
  )
$$;

comment on function public.is_app_superadmin() is
'Returns true only for authenticated users whose profile role is superadmin.';

create or replace function public.set_profile_role_by_superadmin(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_role text;
  profile_current_role text;
  remaining_superadmins integer;
  has_updated_at boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_app_superadmin() then
    raise exception 'Only superadmin can manage user roles';
  end if;

  if target_user_id is null then
    raise exception 'Target profile is required';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Superadmin cannot change their own role';
  end if;

  normalized_role := lower(trim(coalesce(new_role, '')));

  if normalized_role in ('super_admin', 'super-admin') then
    normalized_role := 'superadmin';
  end if;

  -- Role normal yang dipakai app saat ini adalah member/admin/superadmin.
  -- "user" tetap diterima agar tidak memutus data lama bila ada akun lama memakai role user.
  if normalized_role not in ('user', 'member', 'admin', 'superadmin') then
    raise exception 'Invalid role';
  end if;

  select lower(trim(coalesce(role, '')))
  into profile_current_role
  from public.profiles
  where id = target_user_id;

  if not found then
    raise exception 'Target profile not found';
  end if;

  if profile_current_role in ('super_admin', 'super-admin') then
    profile_current_role := 'superadmin';
  end if;

  -- Jika target adalah superadmin, pastikan masih ada minimal 1 superadmin lain.
  if profile_current_role = 'superadmin' and normalized_role <> 'superadmin' then
    select count(*)
    into remaining_superadmins
    from public.profiles
    where lower(trim(coalesce(role, ''))) = 'superadmin'
      and id <> target_user_id;

    if remaining_superadmins < 1 then
      raise exception 'Cannot remove the last superadmin';
    end if;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'updated_at'
  )
  into has_updated_at;

  -- Update dibatasi hanya ke role dan updated_at bila kolomnya tersedia.
  if has_updated_at then
    update public.profiles
    set role = normalized_role,
        updated_at = now()
    where id = target_user_id;
  else
    update public.profiles
    set role = normalized_role
    where id = target_user_id;
  end if;
end;
$$;

comment on function public.set_profile_role_by_superadmin(uuid, text) is
'Safely updates profile roles. Only superadmin may execute. Self-demotion and removing the last superadmin are blocked.';

revoke all on function public.is_app_superadmin() from public;
revoke all on function public.set_profile_role_by_superadmin(uuid, text) from public;
revoke execute on function public.is_app_superadmin() from anon;
revoke execute on function public.set_profile_role_by_superadmin(uuid, text) from anon;

grant execute on function public.is_app_superadmin() to authenticated;
grant execute on function public.set_profile_role_by_superadmin(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
