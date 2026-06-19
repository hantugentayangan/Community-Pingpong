-- Community-Pingpong Batch 5B: public approved members, remove member, transfer Ketua.
-- Jalankan manual di Supabase SQL Editor.
--
-- Prinsip keamanan:
-- - Public member display hanya mengembalikan field aman untuk publik.
-- - Remove/Kick Out member hanya lewat RPC public.remove_ptm_member().
-- - Transfer Ketua hanya lewat RPC public.transfer_ptm_ketua().
-- - Tidak membuka RLS luas untuk public.profiles atau public.players.
-- - Tidak menghapus row membership; status historis disimpan.

begin;

-- Tambahkan status "removed" secara aman ke constraint status.
do $$
declare
  con record;
begin
  for con in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.ptm_memberships'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.ptm_memberships drop constraint if exists %I', con.conname);
  end loop;
end $$;

alter table public.ptm_memberships
  add constraint ptm_memberships_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled', 'left', 'removed'));

comment on column public.ptm_memberships.status is
  'Membership workflow status: pending, approved, rejected, cancelled, left, or removed.';

-- Request Again setelah removed/cancelled/left/rejected harus membuat row baru.
-- Karena itu unique lama ptm_id+user_id harus diganti menjadi partial unique
-- hanya untuk membership yang masih open/aktif.
alter table public.ptm_memberships
  drop constraint if exists ptm_memberships_unique_ptm_user;

create unique index if not exists one_open_ptm_membership_per_user
  on public.ptm_memberships (ptm_id, user_id)
  where status in ('pending', 'approved');

-- Satu PTM hanya boleh punya satu approved ketua.
-- Jika index ini gagal saat SQL dijalankan, berarti ada data duplicate ketua
-- yang perlu dibersihkan manual sebelum transfer ketua diaktifkan.
create unique index if not exists one_approved_ketua_per_ptm
  on public.ptm_memberships (ptm_id)
  where role = 'ketua'
    and status = 'approved';

-- Public-safe approved member list.
-- Function ini sengaja hanya mengembalikan nama/foto publik, role, primary,
-- dan timestamp. Tidak mengembalikan email, phone, NIK/KTP, birth date,
-- alamat, private notes, atau admin notes.
create or replace function public.get_public_ptm_approved_members(target_ptm_id uuid)
returns table (
  membership_id uuid,
  ptm_id uuid,
  user_id uuid,
  role text,
  is_primary boolean,
  display_name text,
  photo_url text,
  avatar_url text,
  requested_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id as membership_id,
    m.ptm_id,
    m.user_id,
    m.role,
    m.is_primary,
    coalesce(
      nullif(trim(pl.full_name), ''),
      nullif(trim(pl.nickname), ''),
      nullif(trim(pr.full_name), ''),
      'Approved Member'
    ) as display_name,
    nullif(trim(coalesce(pl.photo_url, '')), '') as photo_url,
    nullif(trim(coalesce(pl.photo_url, pr.avatar_url, '')), '') as avatar_url,
    m.requested_at,
    m.created_at
  from public.ptm_memberships m
  left join lateral (
    select
      player.full_name,
      player.nickname,
      player.photo_url,
      player.photo_url
    from public.players player
    where (
      (m.player_id is not null and player.id = m.player_id)
      or
      (m.player_id is null and player.user_id = m.user_id)
    )
    order by case when player.id = m.player_id then 0 else 1 end
    limit 1
  ) pl on true
  left join public.profiles pr on pr.id = m.user_id
  where m.ptm_id = target_ptm_id
    and m.status = 'approved'
  order by
    case m.role
      when 'ketua' then 0
      when 'pengurus' then 1
      when 'coach' then 2
      else 3
    end,
    m.is_primary desc,
    m.requested_at asc,
    m.created_at asc;
$$;

comment on function public.get_public_ptm_approved_members(uuid) is
  'Returns public-safe approved PTM members only. Sensitive profile/player fields are intentionally excluded.';

create or replace function public.remove_ptm_member(target_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_ptm_id uuid;
  target_user_id uuid;
  target_role text;
  target_status text;
  ptm_owner_id uuid;
  actor_is_admin boolean;
  actor_is_ketua boolean;
  actor_is_pengurus boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select m.ptm_id, m.user_id, m.role, m.status, p.created_by
  into target_ptm_id, target_user_id, target_role, target_status, ptm_owner_id
  from public.ptm_memberships m
  join public.ptm p on p.id = m.ptm_id
  where m.id = target_membership_id;

  if target_ptm_id is null then
    raise exception 'Approved membership not found';
  end if;

  if target_status <> 'approved' then
    raise exception 'Only approved membership can be removed';
  end if;

  if target_role = 'ketua' then
    raise exception 'Ketua or PTM owner cannot be removed from this flow';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'You cannot remove your own membership from this flow';
  end if;

  if ptm_owner_id = target_user_id then
    raise exception 'Ketua or PTM owner cannot be removed from this flow';
  end if;

  actor_is_admin := coalesce(public.is_app_admin(), false);

  actor_is_ketua := coalesce(public.is_ptm_ketua(target_ptm_id), false);

  select exists (
    select 1
    from public.ptm_memberships m
    where m.ptm_id = target_ptm_id
      and m.user_id = auth.uid()
      and m.status = 'approved'
      and m.role = 'pengurus'
  )
  into actor_is_pengurus;

  if not (
    actor_is_admin
    or actor_is_ketua
    or (actor_is_pengurus and target_role in ('member', 'coach'))
  ) then
    raise exception 'Only PTM Ketua, permitted Pengurus, or admin can remove this member';
  end if;

  if actor_is_pengurus and not actor_is_admin and not actor_is_ketua and target_role = 'pengurus' then
    raise exception 'Only PTM Ketua, permitted Pengurus, or admin can remove this member';
  end if;

  update public.ptm_memberships
  set status = 'removed',
      is_primary = false,
      updated_at = now()
  where id = target_membership_id
    and status = 'approved'
    and role <> 'ketua';
end;
$$;

comment on function public.remove_ptm_member(uuid) is
  'Safely marks an approved non-ketua PTM membership as removed. No row is deleted and no role/audit fields are changed.';

-- Transfer Ketua hanya melalui RPC ini.
-- Function ini memindahkan role ketua dan public.ptm.created_by secara atomik.
create or replace function public.transfer_ptm_ketua(new_ketua_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_ptm_id uuid;
  new_ketua_user_id uuid;
  new_ketua_role text;
  actor_is_superadmin boolean;
  actor_is_current_ketua boolean;
  has_ptm_updated_at boolean;
  ketua_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select m.ptm_id, m.user_id, m.role
  into target_ptm_id, new_ketua_user_id, new_ketua_role
  from public.ptm_memberships m
  where m.id = new_ketua_membership_id
    and m.status = 'approved';

  if target_ptm_id is null then
    raise exception 'Ketua can only be transferred to an approved member of this PTM';
  end if;

  if new_ketua_role not in ('member', 'pengurus', 'coach') then
    raise exception 'Ketua can only be transferred to an approved member of this PTM';
  end if;

  actor_is_superadmin := coalesce(public.is_app_superadmin(), false);

  if new_ketua_user_id = auth.uid() and not actor_is_superadmin then
    raise exception 'Ketua can only be transferred to an approved member of this PTM';
  end if;

  select exists (
    select 1
    from public.ptm p
    where p.id = target_ptm_id
      and p.created_by = auth.uid()
  ) or exists (
    select 1
    from public.ptm_memberships m
    where m.ptm_id = target_ptm_id
      and m.user_id = auth.uid()
      and m.status = 'approved'
      and m.role = 'ketua'
  )
  into actor_is_current_ketua;

  if not (actor_is_superadmin or actor_is_current_ketua) then
    raise exception 'Only current PTM Ketua or superadmin can transfer Ketua';
  end if;

  if exists (
    select 1
    from public.ptm_memberships m
    where m.user_id = new_ketua_user_id
      and m.status = 'approved'
      and m.role = 'ketua'
      and m.ptm_id <> target_ptm_id
  ) then
    raise exception 'This member is already Ketua of another PTM';
  end if;

  update public.ptm_memberships
  set role = 'member',
      updated_at = now()
  where ptm_id = target_ptm_id
    and status = 'approved'
    and role = 'ketua';

  update public.ptm_memberships
  set role = 'ketua',
      updated_at = now()
  where id = new_ketua_membership_id
    and ptm_id = target_ptm_id
    and status = 'approved'
    and role in ('member', 'pengurus', 'coach');

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ptm'
      and column_name = 'updated_at'
  )
  into has_ptm_updated_at;

  if has_ptm_updated_at then
    update public.ptm
    set created_by = new_ketua_user_id,
        updated_at = now()
    where id = target_ptm_id;
  else
    update public.ptm
    set created_by = new_ketua_user_id
    where id = target_ptm_id;
  end if;

  select count(*)
  into ketua_count
  from public.ptm_memberships m
  where m.ptm_id = target_ptm_id
    and m.status = 'approved'
    and m.role = 'ketua';

  if ketua_count <> 1 then
    raise exception 'Transfer would leave PTM without exactly one approved ketua';
  end if;
end;
$$;

comment on function public.transfer_ptm_ketua(uuid) is
  'Safely transfers PTM Ketua to an approved member and updates ptm.created_by. This is the only approved Ketua transfer path.';

revoke all on function public.get_public_ptm_approved_members(uuid) from public;
revoke all on function public.remove_ptm_member(uuid) from public;
revoke all on function public.transfer_ptm_ketua(uuid) from public;
revoke execute on function public.remove_ptm_member(uuid) from anon;
revoke execute on function public.transfer_ptm_ketua(uuid) from anon;

grant execute on function public.get_public_ptm_approved_members(uuid) to anon, authenticated;
grant execute on function public.remove_ptm_member(uuid) to authenticated;
grant execute on function public.transfer_ptm_ketua(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
