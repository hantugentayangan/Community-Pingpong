-- Community-Pingpong Batch 4G: Primary PTM selection through RPC only.
--
-- Run manually in Supabase SQL Editor.
-- This function is the only approved path for Primary PTM selection.
-- Do not grant direct update access to public.ptm_memberships.is_primary.

begin;

create or replace function public.set_primary_ptm_membership(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select m.user_id
  into target_user_id
  from public.ptm_memberships m
  where m.id = target_membership_id
    and m.status = 'approved';

  if target_user_id is null then
    raise exception 'Approved membership not found';
  end if;

  if target_user_id <> auth.uid() then
    raise exception 'Not allowed to set primary PTM for another user';
  end if;

  -- Unset any previous approved primary membership for the authenticated user.
  -- This intentionally updates only is_primary and updated_at.
  update public.ptm_memberships
  set
    is_primary = false,
    updated_at = now()
  where user_id = auth.uid()
    and status = 'approved'
    and is_primary = true
    and id <> target_membership_id;

  -- Set the target approved membership as primary for the authenticated user.
  -- This intentionally does not update role/status/ptm_id/user_id/player_id or audit fields.
  update public.ptm_memberships
  set
    is_primary = true,
    updated_at = now()
  where id = target_membership_id
    and user_id = auth.uid()
    and status = 'approved';
end;
$$;

comment on function public.set_primary_ptm_membership(uuid) is
  'Safely sets one approved PTM membership as primary for the authenticated user without granting direct table update access to is_primary.';

revoke all on function public.set_primary_ptm_membership(uuid) from public;
grant execute on function public.set_primary_ptm_membership(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
