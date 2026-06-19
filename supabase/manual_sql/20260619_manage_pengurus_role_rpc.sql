-- Community-Pingpong Batch 4I: safe PTM pengurus role management RPC.
--
-- Run manually in Supabase SQL Editor.
-- These RPCs are the only approved path for pengurus role management.
-- The UI must not update public.ptm_memberships.role directly.
-- Do not grant direct update(role) to authenticated users.
-- Only app admin or PTM Ketua can promote/demote pengurus.

begin;

create or replace function public.promote_ptm_member_to_pengurus(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_ptm_id uuid;
  target_user_id uuid;
  target_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select m.ptm_id, m.user_id, m.role
  into target_ptm_id, target_user_id, target_role
  from public.ptm_memberships m
  where m.id = target_membership_id
    and m.status = 'approved';

  if target_ptm_id is null then
    raise exception 'Approved membership not found';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Cannot change your own PTM role';
  end if;

  if not (public.is_app_admin() or public.is_ptm_ketua(target_ptm_id)) then
    raise exception 'Only PTM Ketua or admin can promote pengurus';
  end if;

  if target_role not in ('member', 'coach') then
    raise exception 'Only member or coach can be promoted to pengurus';
  end if;

  update public.ptm_memberships
  set role = 'pengurus',
      updated_at = now()
  where id = target_membership_id
    and status = 'approved'
    and role in ('member', 'coach');
end;
$$;

create or replace function public.demote_ptm_pengurus_to_member(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_ptm_id uuid;
  target_user_id uuid;
  target_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select m.ptm_id, m.user_id, m.role
  into target_ptm_id, target_user_id, target_role
  from public.ptm_memberships m
  where m.id = target_membership_id
    and m.status = 'approved';

  if target_ptm_id is null then
    raise exception 'Approved membership not found';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Cannot change your own PTM role';
  end if;

  if not (public.is_app_admin() or public.is_ptm_ketua(target_ptm_id)) then
    raise exception 'Only PTM Ketua or admin can demote pengurus';
  end if;

  if target_role <> 'pengurus' then
    raise exception 'Only pengurus can be demoted to member';
  end if;

  update public.ptm_memberships
  set role = 'member',
      updated_at = now()
  where id = target_membership_id
    and status = 'approved'
    and role = 'pengurus';
end;
$$;

comment on function public.promote_ptm_member_to_pengurus(uuid) is
  'Safely promotes approved PTM member/coach to pengurus. Only PTM Ketua or app admin may execute.';

comment on function public.demote_ptm_pengurus_to_member(uuid) is
  'Safely demotes approved PTM pengurus to member. Only PTM Ketua or app admin may execute.';

revoke all on function public.promote_ptm_member_to_pengurus(uuid) from public;
revoke all on function public.demote_ptm_pengurus_to_member(uuid) from public;
revoke execute on function public.promote_ptm_member_to_pengurus(uuid) from anon;
revoke execute on function public.demote_ptm_pengurus_to_member(uuid) from anon;

grant execute on function public.promote_ptm_member_to_pengurus(uuid) to authenticated;
grant execute on function public.demote_ptm_pengurus_to_member(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
