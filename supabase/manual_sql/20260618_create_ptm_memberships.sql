-- Community-Pingpong Batch 4B: create public.ptm_memberships.
--
-- Run manually in Supabase SQL Editor.
-- Existing public.ptm_access schema has been verified before this file was created.
-- Recommended: run on staging first if available.
-- Review carefully before running in production.
--
-- Do not remove legacy players.ptm_name, players.ptm_status, or public.ptm_access yet.
-- public.ptm_memberships is for public PTM membership data and future member counts.
-- public.ptm_access remains backward-compatible for legacy edit/access permission.
-- players.ptm_name and players.ptm_status are legacy display fields only; they are
-- not official PTM membership or PTM edit permission sources in the new system.
-- Users can have multiple approved PTM memberships, but only one approved
-- membership can be marked as Primary PTM for public player/dashboard display.
--
-- Future UI batches will implement request join, pending status, approval by
-- ketua/pengurus/admin, approved member list, member count, Primary PTM display,
-- and all-memberships detail/profile views.

begin;

create table if not exists public.ptm_memberships (
  id uuid primary key default gen_random_uuid(),
  ptm_id uuid not null references public.ptm(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  role text not null default 'member'
    check (role in ('ketua', 'pengurus', 'member', 'coach')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'left')),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  note text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ptm_memberships_unique_ptm_user unique (ptm_id, user_id)
);

alter table public.ptm_memberships
  add column if not exists is_primary boolean not null default false;

comment on table public.ptm_memberships is
  'Public PTM membership table. ptm_access remains for legacy PTM edit/access permission.';

comment on column public.ptm_memberships.role is
  'Membership role inside one PTM: ketua, pengurus, member, or coach.';

comment on column public.ptm_memberships.status is
  'Membership workflow status: pending, approved, rejected, cancelled, or left.';

comment on column public.ptm_memberships.is_primary is
  'Marks one approved PTM membership as the primary PTM for public player/dashboard display.';

create index if not exists idx_ptm_memberships_ptm_id
  on public.ptm_memberships (ptm_id);

create index if not exists idx_ptm_memberships_user_id
  on public.ptm_memberships (user_id);

create index if not exists idx_ptm_memberships_status
  on public.ptm_memberships (status);

-- One user can only be an approved ketua for one PTM for now.
create unique index if not exists one_approved_ketua_ptm_per_user
  on public.ptm_memberships (user_id)
  where role = 'ketua'
    and status = 'approved';

-- A user can join multiple approved PTM/clubs, but only one approved membership
-- can be marked as Primary PTM. Future UI should use Primary PTM for player list
-- and dashboard display, while detail/profile pages can show all memberships.
create unique index if not exists one_primary_approved_ptm_per_user
  on public.ptm_memberships (user_id)
  where is_primary = true
    and status = 'approved';

-- Expose the table through Supabase REST while RLS remains the real row-level gate.
grant select on table public.ptm_memberships to anon, authenticated;
grant insert, update, delete on table public.ptm_memberships to authenticated;

-- Backfill existing PTM creators.
-- Duplicate approved ketua is not allowed. If a legacy user created multiple PTM,
-- only the earliest PTM is backfilled as approved ketua. The rest are inserted as
-- pending ketua with a note so admins can review manually.
with ranked_ptm_owners as (
  select
    p.id as ptm_id,
    p.created_by as user_id,
    p.created_at,
    row_number() over (
      partition by p.created_by
      order by p.created_at asc nulls last, p.id asc
    ) as owner_rank
  from public.ptm p
  where p.created_by is not null
),
owner_players as (
  select distinct on (pl.user_id)
    pl.user_id,
    pl.id as player_id
  from public.players pl
  where pl.user_id is not null
  order by pl.user_id, pl.id asc
)
insert into public.ptm_memberships (
  ptm_id,
  user_id,
  player_id,
  role,
  status,
  requested_at,
  approved_at,
  approved_by,
  note,
  is_primary,
  created_at,
  updated_at
)
select
  owner.ptm_id,
  owner.user_id,
  player.player_id,
  'ketua',
  case when owner.owner_rank = 1 then 'approved' else 'pending' end,
  coalesce(owner.created_at, now()),
  case when owner.owner_rank = 1 then coalesce(owner.created_at, now()) else null end,
  case when owner.owner_rank = 1 then owner.user_id else null end,
  case
    when owner.owner_rank = 1 then 'Backfilled from legacy ptm.created_by as approved ketua.'
    else 'Legacy duplicate PTM owner. One user can only have one approved ketua membership; review manually.'
  end,
  case when owner.owner_rank = 1 then true else false end,
  coalesce(owner.created_at, now()),
  now()
from ranked_ptm_owners owner
left join owner_players player on player.user_id = owner.user_id
on conflict (ptm_id, user_id) do nothing;

alter table public.ptm_memberships enable row level security;

-- Helper: app admin check based on public.profiles.
-- Kept in public for compatibility with existing app SQL patterns.
create or replace function public.is_app_admin()
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
      and lower(trim(coalesce(p.role, ''))) in ('admin', 'superadmin')
  )
$$;

-- Helper: PTM manager check.
-- Allows app admin, legacy PTM owner, approved ptm_access manager, or approved
-- ptm_memberships ketua/pengurus.
-- can_manage_ptm is for approving/rejecting normal member requests and legacy
-- edit permission compatibility. It must not be used to promote users to
-- ketua/pengurus.
create or replace function public.can_manage_ptm(target_ptm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_app_admin(), false)
    or exists (
      select 1
      from public.ptm p
      where p.id = target_ptm_id
        and p.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.ptm_access access
      where access.ptm_id = target_ptm_id
        and access.user_id = auth.uid()
        and lower(trim(coalesce(access.access_status, ''))) = 'approved'
        and lower(trim(coalesce(access.ptm_role, ''))) in (
          'ketua',
          'ketua ptm',
          'pengurus',
          'pengurus ptm',
          'admin',
          'manager'
        )
    )
    or exists (
      select 1
      from public.ptm_memberships membership
      where membership.ptm_id = target_ptm_id
        and membership.user_id = auth.uid()
        and membership.status = 'approved'
        and membership.role in ('ketua', 'pengurus')
    )
$$;

-- Helper: PTM ketua authority check.
-- This should be used by future Ketua/Admin-only flows, such as promotion to
-- pengurus. It is intentionally separate from can_manage_ptm().
create or replace function public.is_ptm_ketua(target_ptm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.is_app_admin(), false)
    or exists (
      select 1
      from public.ptm p
      where p.id = target_ptm_id
        and p.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.ptm_memberships membership
      where membership.ptm_id = target_ptm_id
        and membership.user_id = auth.uid()
        and membership.status = 'approved'
        and membership.role = 'ketua'
    )
$$;

revoke all on function public.is_app_admin() from public;
revoke all on function public.can_manage_ptm(uuid) from public;
revoke all on function public.is_ptm_ketua(uuid) from public;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.can_manage_ptm(uuid) to authenticated;
grant execute on function public.is_ptm_ketua(uuid) to authenticated;

drop policy if exists "ptm_memberships public read approved" on public.ptm_memberships;
create policy "ptm_memberships public read approved"
on public.ptm_memberships
for select
to anon, authenticated
using (status = 'approved');

drop policy if exists "ptm_memberships users read own" on public.ptm_memberships;
create policy "ptm_memberships users read own"
on public.ptm_memberships
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "ptm_memberships managers read requests" on public.ptm_memberships;
create policy "ptm_memberships managers read requests"
on public.ptm_memberships
for select
to authenticated
using (public.can_manage_ptm(ptm_id));

drop policy if exists "ptm_memberships users request join" on public.ptm_memberships;
create policy "ptm_memberships users request join"
on public.ptm_memberships
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'member'
  and status = 'pending'
  and is_primary = false
  and exists (
    select 1
    from public.ptm p
    where p.id = ptm_id
      and lower(trim(coalesce(p.status, ''))) in ('approved', 'active')
      and lower(trim(coalesce(p.ptm_status, 'active'))) in ('active', 'aktif', 'approved')
  )
);

drop policy if exists "ptm_memberships users cancel pending" on public.ptm_memberships;
create policy "ptm_memberships users cancel pending"
on public.ptm_memberships
for update
to authenticated
using (
  user_id = auth.uid()
  and status = 'pending'
  and role = 'member'
  and is_primary = false
)
with check (
  user_id = auth.uid()
  and status = 'cancelled'
  and role = 'member'
  and is_primary = false
);

-- This policy only approves/rejects normal member requests.
-- It intentionally cannot promote users to ketua/pengurus.
-- It intentionally cannot set Primary PTM.
-- Promotion to pengurus should be handled later by a separate Ketua/Admin-only
-- policy using public.is_ptm_ketua().
-- Primary PTM selection should be handled later by a separate
-- own-approved-membership policy.
-- Legacy pending ketua rows must be handled by the admin policy.
drop policy if exists "ptm_memberships managers approve reject" on public.ptm_memberships;
create policy "ptm_memberships managers approve reject"
on public.ptm_memberships
for update
to authenticated
using (
  public.can_manage_ptm(ptm_id)
  and status = 'pending'
  and role = 'member'
  and is_primary = false
)
with check (
  public.can_manage_ptm(ptm_id)
  and status in ('approved', 'rejected')
  and role = 'member'
  and is_primary = false
);

drop policy if exists "ptm_memberships admins manage all" on public.ptm_memberships;
create policy "ptm_memberships admins manage all"
on public.ptm_memberships
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

notify pgrst, 'reload schema';

commit;

-- Suggested manual verification after running:
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'ptm_memberships'
-- order by policyname;
--
-- select role, status, count(*)
-- from public.ptm_memberships
-- group by role, status
-- order by role, status;
--
-- Review pending duplicate legacy owner rows:
-- select *
-- from public.ptm_memberships
-- where role = 'ketua'
--   and status = 'pending'
--   and note ilike '%Legacy duplicate PTM owner%';
