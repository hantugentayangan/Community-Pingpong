-- Community-Pingpong Batch 4JNO: PTM membership self-service RPCs.
--
-- Run manually in Supabase SQL Editor.
-- These RPCs are the only approved path for cancel/leave self-service.
-- The UI must not update public.ptm_memberships.status directly for cancel/leave.
-- Do not grant direct update(status) to authenticated users for this flow.

begin;

create or replace function public.cancel_ptm_membership_request(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_status text;
  target_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select m.user_id, m.status, m.role
  into target_user_id, target_status, target_role
  from public.ptm_memberships m
  where m.id = target_membership_id;

  if target_user_id is null then
    raise exception 'Membership request not found';
  end if;

  if target_user_id <> auth.uid() then
    raise exception 'Not allowed to cancel another user membership request';
  end if;

  if target_status <> 'pending' then
    raise exception 'Only pending membership request can be cancelled';
  end if;

  if target_role <> 'member' then
    raise exception 'Only member join request can be cancelled';
  end if;

  update public.ptm_memberships
  set status = 'cancelled',
      is_primary = false,
      updated_at = now()
  where id = target_membership_id
    and user_id = auth.uid()
    and status = 'pending'
    and role = 'member';
end;
$$;

create or replace function public.leave_ptm_membership(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_status text;
  target_role text;
  target_ptm_id uuid;
  is_creator boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select m.user_id, m.status, m.role, m.ptm_id
  into target_user_id, target_status, target_role, target_ptm_id
  from public.ptm_memberships m
  where m.id = target_membership_id;

  if target_user_id is null then
    raise exception 'Membership not found';
  end if;

  if target_user_id <> auth.uid() then
    raise exception 'Not allowed to leave another user membership';
  end if;

  if target_status <> 'approved' then
    raise exception 'Only approved membership can be left';
  end if;

  if target_role = 'ketua' then
    raise exception 'Ketua cannot leave PTM from this flow';
  end if;

  select exists (
    select 1
    from public.ptm p
    where p.id = target_ptm_id
      and p.created_by = auth.uid()
  ) into is_creator;

  if is_creator then
    raise exception 'PTM creator cannot leave PTM from this flow';
  end if;

  update public.ptm_memberships
  set status = 'left',
      is_primary = false,
      updated_at = now()
  where id = target_membership_id
    and user_id = auth.uid()
    and status = 'approved'
    and role <> 'ketua';
end;
$$;

comment on function public.cancel_ptm_membership_request(uuid) is
  'Safely cancels an authenticated user own pending PTM join request without direct table update access.';

comment on function public.leave_ptm_membership(uuid) is
  'Safely marks an authenticated user own approved non-ketua PTM membership as left without direct table update access.';

revoke all on function public.cancel_ptm_membership_request(uuid) from public;
revoke all on function public.leave_ptm_membership(uuid) from public;
revoke execute on function public.cancel_ptm_membership_request(uuid) from anon;
revoke execute on function public.leave_ptm_membership(uuid) from anon;

grant execute on function public.cancel_ptm_membership_request(uuid) to authenticated;
grant execute on function public.leave_ptm_membership(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
