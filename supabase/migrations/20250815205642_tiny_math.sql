/*
  # Ensure Organizations Schema

  1. New Tables
    - `organizations` with `owner_id` column
    - `org_members` for membership tracking

  2. Functions
    - `get_active_org_id()` RPC function

  3. Security
    - Enable RLS on both tables
    - Add policies for owners and members

  4. Indexes
    - Performance indexes for common queries
*/

-- Enable required extension (safe)
create extension if not exists pgcrypto;

-- ========== organizations ==========
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid,
  created_at timestamptz not null default now()
);

-- ensure owner_id exists even if table pre-existed
alter table public.organizations
  add column if not exists owner_id uuid;

-- optional FK (safe)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizations_owner_fk'
  ) then
    alter table public.organizations
      add constraint organizations_owner_fk
      foreign key (owner_id) references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists idx_orgs_owner on public.organizations(owner_id);

-- ========== org_members ==========
create table if not exists public.org_members (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- ========== minimal RPCs ==========
create or replace function public.get_active_org_id()
returns uuid
language sql
security definer
stable
as $$
  select om.org_id
  from public.org_members om
  where om.user_id = auth.uid()
  order by om.created_at asc
  limit 1
$$;

-- ========== RLS (minimal & non-recursive) ==========
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;

-- owners can see their org
do $$
begin
  create policy orgs_owner_select on public.organizations
    for select using (owner_id = auth.uid());
exception when duplicate_object then null; end $$;

-- members can see orgs they belong to
do $$
begin
  create policy orgs_member_select on public.organizations
    for select using (exists (
      select 1 from public.org_members m
      where m.org_id = organizations.id and m.user_id = auth.uid()
    ));
exception when duplicate_object then null; end $$;

-- members table: user sees their rows
do $$
begin
  create policy org_members_self on public.org_members
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;