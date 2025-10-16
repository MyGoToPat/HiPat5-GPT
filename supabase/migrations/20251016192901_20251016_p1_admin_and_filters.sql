-- === P1 Admin & Filters - Swarm Response Pipeline ===
-- Phase 1: Admin-driven prompts, versioning, rollout, dietary filters
-- Idempotent: safe to re-run

-- === Extensions (safe no-ops if present) ===
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- === Swarm + Agent Config ===
create table if not exists public.swarms (
  id            text primary key,
  name          text not null,
  description   text,
  default_model text,
  enabled       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.agent_prompts (
  id           uuid primary key default gen_random_uuid(),
  agent_id     text not null,
  title        text not null,
  content      text not null,
  model        text not null default 'gpt-4o-mini',
  phase        text not null check (phase in ('pre','core','filter','presenter','post','render')),
  exec_order   int  not null default 50,
  status       text not null check (status in ('draft','published')) default 'draft',
  version      int  not null default 1,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  checksum     text generated always as (md5(content)) stored
);

create table if not exists public.swarm_agents (
  swarm_id        text references public.swarms(id) on delete cascade,
  agent_prompt_id uuid references public.agent_prompts(id) on delete cascade,
  phase           text not null check (phase in ('pre','core','filter','presenter','post','render')),
  exec_order      int  not null default 50,
  enabled         boolean not null default true,
  primary key (swarm_id, agent_prompt_id)
);

create table if not exists public.swarm_versions (
  id              uuid primary key default gen_random_uuid(),
  swarm_id        text not null references public.swarms(id) on delete cascade,
  status          text not null check (status in ('draft','published','archived')) default 'draft',
  rollout_percent int  not null default 0 check (rollout_percent between 0 and 100),
  manifest        jsonb not null,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  published_at    timestamptz
);

create table if not exists public.agent_test_runs (
  id              uuid primary key default gen_random_uuid(),
  agent_prompt_id uuid references public.agent_prompts(id) on delete cascade,
  input           jsonb not null,
  output          jsonb,
  model           text,
  token_usage     jsonb,
  latency_ms      int,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  notes           text
);

-- === Dietary Filter Rules ===
create table if not exists public.dietary_filter_rules (
  id            uuid primary key default gen_random_uuid(),
  type          text not null,
  condition     jsonb not null,
  annotations   jsonb not null default '[]'::jsonb,
  substitutions jsonb not null default '[]'::jsonb,
  enabled       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Seed shell rules
insert into public.dietary_filter_rules (id, type, condition, annotations, substitutions, enabled)
values
  (gen_random_uuid(), 'keto',      jsonb_build_object('carb_grams_max', 20),  '[]'::jsonb, '[]'::jsonb, true),
  (gen_random_uuid(), 'low_carb',  jsonb_build_object('carb_grams_max', 100), '[]'::jsonb, '[]'::jsonb, true),
  (gen_random_uuid(), 'carnivore', jsonb_build_object('allow_only', 'animal_based'), '[]'::jsonb, '[]'::jsonb, true)
on conflict do nothing;

-- === User Preferences dietary fields (add if missing) ===
alter table if exists public.user_preferences
  add column if not exists diet_type text not null default 'balanced',
  add column if not exists macro_overrides jsonb not null default '{}'::jsonb,
  add column if not exists allergens jsonb not null default '[]'::jsonb,
  add column if not exists religious_restrictions jsonb not null default '[]'::jsonb;

-- === Indexes ===
create index if not exists idx_agent_prompts_agent_phase_order
  on public.agent_prompts(agent_id, phase, exec_order);
create index if not exists idx_swarm_agents_swarm_phase_order
  on public.swarm_agents(swarm_id, phase, exec_order);
create index if not exists idx_swarm_versions_swarm_status
  on public.swarm_versions(swarm_id, status);
create index if not exists idx_dietary_filter_rules_type
  on public.dietary_filter_rules(type);

-- === Touch updated_at triggers ===
create or replace function public.tg_touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'tg_touch_swarms') then
    create trigger tg_touch_swarms before update on public.swarms
    for each row execute procedure public.tg_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tg_touch_agent_prompts') then
    create trigger tg_touch_agent_prompts before update on public.agent_prompts
    for each row execute procedure public.tg_touch_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'tg_touch_dietary_filter_rules') then
    create trigger tg_touch_dietary_filter_rules before update on public.dietary_filter_rules
    for each row execute procedure public.tg_touch_updated_at();
  end if;
end $$;

-- === RLS (config tables admin/service-role only) ===
alter table public.swarms enable row level security;
alter table public.agent_prompts enable row level security;
alter table public.swarm_agents enable row level security;
alter table public.swarm_versions enable row level security;
alter table public.agent_test_runs enable row level security;
alter table public.dietary_filter_rules enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='swarms') then
    create policy swarms_service_role_all on public.swarms
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agent_prompts') then
    create policy agent_prompts_service_role_all on public.agent_prompts
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='swarm_agents') then
    create policy swarm_agents_service_role_all on public.swarm_agents
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='swarm_versions') then
    create policy swarm_versions_service_role_all on public.swarm_versions
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='agent_test_runs') then
    create policy agent_test_runs_service_role_all on public.agent_test_runs
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='dietary_filter_rules') then
    create policy dietary_filter_rules_service_role_all on public.dietary_filter_rules
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end $$;

-- === Publish helpers ===
create or replace function public.publish_swarm_version(p_version_id uuid)
returns void language plpgsql as $$
declare v_swarm text;
begin
  select swarm_id into v_swarm from public.swarm_versions where id = p_version_id;
  if v_swarm is null then
    raise exception 'swarm_version % not found', p_version_id;
  end if;
  update public.swarm_versions
    set status = case when id = p_version_id then 'published' else 'archived' end,
        published_at = case when id = p_version_id then now() else published_at end
    where swarm_id = v_swarm and status in ('draft','published');
end $$;

create or replace function public.get_active_swarm_manifest(p_swarm_id text)
returns jsonb language sql stable as $$
  select manifest
  from public.swarm_versions
  where swarm_id = p_swarm_id and status = 'published'
  order by published_at desc
  limit 1
$$;
