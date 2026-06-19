begin;

-- Normalize legacy super_admin role values into canonical superadmin.
update public.profiles
set
  role = 'superadmin',
  updated_at = now()
where lower(trim(coalesce(role, ''))) in ('super_admin', 'super-admin', 'super admin');

-- Make superadmin detection tolerant to legacy role formatting.
create or replace function public.is_app_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.profiles p
    where replace(lower(trim(coalesce(p.role, ''))), '_', '') = 'superadmin'
      and (
        p.id = auth.uid()
        or lower(trim(coalesce(p.email, ''))) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
      )
  )
$function$;

revoke execute on function public.is_app_superadmin() from public;
revoke execute on function public.is_app_superadmin() from anon;
grant execute on function public.is_app_superadmin() to authenticated;

notify pgrst, 'reload schema';

commit;
