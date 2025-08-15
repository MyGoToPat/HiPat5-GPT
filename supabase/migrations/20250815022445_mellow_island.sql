-- ========== ORGS CORE ==========
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

create table if not exists public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  status text not null default 'active' check (status in ('active','invited','inactive')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
alter table public.org_members enable row level security;

create table if not exists public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table public.org_invitations enable row level security;

create index if not exists organizations_owner_idx on public.organizations(owner_id);
create index if not exists org_members_user_idx on public.org_members(user_id);
create index if not exists org_invitations_org_idx on public.org_invitations(org_id);

-- ========== PROFILE ACTIVE ORG ==========
alter table public.profiles
  add column if not exists active_org_id uuid null references public.organizations(id);

create or replace function public.get_active_org_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select active_org_id from public.profiles where user_id = auth.uid();
$$;

create or replace function public.set_active_org(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Not a member of that organization';
  end if;

  update public.profiles
     set active_org_id = p_org_id, updated_at = now()
   where user_id = auth.uid();
end;
$$;

-- ========== ORG POLICIES ==========
-- helper we already have:
-- get_user_role() -> text  (returns 'admin' when app_metadata.role = 'admin')

-- organizations
drop policy if exists orgs_owner_manage on public.organizations;
drop policy if exists orgs_member_read on public.organizations;
create policy orgs_owner_manage on public.organizations
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
create policy orgs_member_read on public.organizations
  for select to authenticated
  using (exists (select 1 from public.org_members m
                 where m.org_id = organizations.id and m.user_id = auth.uid() and m.status='active'));

-- org_members
drop policy if exists org_members_owner_admin_manage on public.org_members;
drop policy if exists org_members_member_read_self on public.org_members;
create policy org_members_owner_admin_manage on public.org_members
  for all to authenticated
  using (
    exists (select 1 from public.org_members me
            where me.org_id = org_members.org_id
              and me.user_id = auth.uid()
              and me.role in ('owner','admin')
              and me.status='active')
  )
  with check (exists (select 1 from public.org_members me
            where me.org_id = org_members.org_id
              and me.user_id = auth.uid()
              and me.role in ('owner','admin')
              and me.status='active'));
create policy org_members_member_read_self on public.org_members
  for select to authenticated
  using (user_id = auth.uid());

-- org_invitations
drop policy if exists org_inviter_manage on public.org_invitations;
drop policy if exists org_invitee_read on public.org_invitations;
create policy org_inviter_manage on public.org_invitations
  for all to authenticated
  using (invited_by = auth.uid())
  with check (invited_by = auth.uid());
create policy org_invitee_read on public.org_invitations
  for select to authenticated
  using (invited_email = (select email from public.profiles where user_id = auth.uid()));

-- ========== ADD org_id TO AGENTS & VERSIONS (backward compatible) ==========
alter table public.agents
  add column if not exists org_id uuid references public.organizations(id);
alter table public.agent_versions
  add column if not exists org_id uuid references public.organizations(id);

-- backfill agents/org_id from creator's future personal org (set below)
-- (safe to run again; will only fill nulls)
-- we will run a personal-org backfill and then:
-- update public.agents a
--   set org_id = p.active_org_id
--  from public.profiles p
--  where a.org_id is null and a.created_by = p.user_id;
-- update public.agent_versions v
--   set org_id = a.org_id
--  from public.agents a
--  where v.org_id is null and v.agent_id = a.id;

-- ========== TRANSITIONAL RLS FOR AGENTS ==========
-- Keep existing owner + admin policy; widen reads/writes to also allow active org.
-- NOTE: we already created agents_* policies in Phase 1. Replace with these two:

drop policy if exists agents_owner_or_activeorg_all on public.agents;
drop policy if exists agents_admin_all_jwt on public.agents;
create policy agents_owner_or_activeorg_all on public.agents
  for all to authenticated
  using (
    created_by = auth.uid()
    or (org_id is not null and org_id = public.get_active_org_id())
  )
  with check (
    created_by = auth.uid()
    or (org_id is not null and org_id = public.get_active_org_id())
  );

drop policy if exists agent_versions_owner_or_activeorg_all on public.agent_versions;
drop policy if exists agent_versions_admin_all_jwt on public.agent_versions;
create policy agent_versions_owner_or_activeorg_all on public.agent_versions
  for all to authenticated
  using (
    exists (select 1 from public.agents a
            where a.id = agent_versions.agent_id
              and (a.created_by = auth.uid()
                   or (a.org_id is not null and a.org_id = public.get_active_org_id())))
  )
  with check (
    exists (select 1 from public.agents a
            where a.id = agent_versions.agent_id
              and (a.created_by = auth.uid()
                   or (a.org_id is not null and a.org_id = public.get_active_org_id())))
  );

-- Admin override stays implicit via existing get_user_role() = 'admin' on our admin_* policies if present.

-- ========== PERSONAL ORG BACKFILL ==========
create or replace function public.backfill_personal_orgs()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  new_org uuid;
begin
  for r in
    select u.id, coalesce(p.email, u.email) as email
    from auth.users u
    left join public.profiles p on p.user_id = u.id
  loop
    -- create org only if user has no owner membership
    if not exists (select 1 from public.org_members m where m.user_id = r.id and m.role='owner') then
      insert into public.organizations (name, owner_id)
      values (coalesce(r.email,'User') || ' Personal Org', r.id)
      returning id into new_org;

      insert into public.org_members (org_id, user_id, role, status)
      values (new_org, r.id, 'owner', 'active');

      update public.profiles set active_org_id = new_org, updated_at = now()
      where user_id = r.id;
    end if;
  end loop;

  -- backfill agents and versions org_id where null
  update public.agents a
     set org_id = p.active_org_id
    from public.profiles p
   where a.org_id is null and a.created_by = p.user_id;

  update public.agent_versions v
     set org_id = a.org_id
    from public.agents a
   where v.org_id is null and v.agent_id = a.id;
end;
$$;
-- To execute once after creation:
-- select public.backfill_personal_orgs();