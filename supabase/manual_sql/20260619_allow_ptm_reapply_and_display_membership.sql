-- Community-Pingpong Batch 4F: allow PTM reapply after closed membership states.
--
-- Run manually in Supabase SQL Editor.
-- This migration keeps membership history rows and does not delete existing data.
-- rejected/cancelled/left are closed historical states, so users may reapply.
-- pending/approved are open/active states and must remain unique per PTM/user.

begin;

-- The original table-level unique constraint blocked all future reapply attempts
-- for the same PTM/user, including after rejected, cancelled, or left.
alter table public.ptm_memberships
drop constraint if exists ptm_memberships_unique_ptm_user;

-- Keep blocking duplicate open memberships while allowing closed historical rows.
create unique index if not exists one_open_ptm_membership_per_user
on public.ptm_memberships (ptm_id, user_id)
where status in ('pending', 'approved');

comment on index public.one_open_ptm_membership_per_user is
  'Prevents duplicate pending/approved PTM memberships while allowing users to reapply after rejected, cancelled, or left.';

notify pgrst, 'reload schema';

commit;
