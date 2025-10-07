-- Swarm Overhaul: Fiber-First Macro System
-- Phase 2 SQL - Apply exactly as specified

-- 0) Enable extension (gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Portion defaults (used by shared Portion Resolver)
create table if not exists public.food_unit_defaults (
  food_key text primary key,           -- e.g. 'bacon.slice_cooked','bread.slice','egg.large'
  unit text not null,                  -- 'slice','piece','large','cup_cooked','serving'
  grams numeric not null check (grams > 0),
  basis text not null default 'cooked', -- 'cooked'|'raw'
  notes text,
  updated_at timestamptz not null default now()
);

insert into public.food_unit_defaults (food_key, unit, grams, basis, notes) values
  ('bacon.slice_cooked','slice',10,'cooked','avg cooked slice'),
  ('bread.slice','slice',40,'cooked','sandwich bread; sourdough ≈ 50g'),
  ('egg.large','large',50,'cooked','whole egg edible portion'),
  ('cheese.slice','slice',23,'cooked','processed slice'),
  ('rice.cup_cooked','cup_cooked',158,'cooked','USDA cooked white rice'),
  ('chicken.breast_default','serving',170,'cooked','6 oz cooked default'),
  ('steak.default','serving',227,'cooked','8 oz cooked default')
on conflict (food_key) do update set grams = excluded.grams, basis = excluded.basis, notes = excluded.notes, updated_at = now();

-- 2) Nutrition cache (optional but recommended)
create table if not exists public.food_cache (
  cache_key text primary key,           -- e.g. 'bacon|cooked|per_100g' or 'Big Mac|as_served'
  payload jsonb not null,               -- canonical macros+metadata
  source text not null,                 -- 'brand','usda','estimate'
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists food_cache_expires_idx on public.food_cache (expires_at);

-- 3) Macro payload staging (safe "Log All")
create table if not exists public.macro_payloads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,     -- chat_sessions.id
  user_id uuid not null,        -- auth.uid
  payload jsonb not null,       -- {items:[...], totals:{...}, ...} INCLUDING fiber_g
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists macro_payloads_one_open_per_session
  on public.macro_payloads (session_id) where (consumed = false);

-- 4) Meal tables (ensure columns exist)
alter table if exists public.meal_logs
  add column if not exists basis text default 'cooked';

alter table if exists public.meal_items
  add column if not exists grams_used numeric,
  add column if not exists basis text default 'cooked',
  add column if not exists fiber_g numeric default 0,
  add column if not exists kcal numeric,       -- if missing in your schema
  add column if not exists protein_g numeric,  -- if missing
  add column if not exists carbs_g numeric,    -- if missing
  add column if not exists fat_g numeric;      -- if missing

-- 5) Day rollups (canonical daily totals incl. fiber)
create table if not exists public.day_rollups (
  user_id uuid not null,
  day date not null,
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  primary key (user_id, day)
);

create or replace function public.fn_update_day_rollups()
returns trigger language plpgsql as $$
declare
  v_user uuid;
  v_day date;
begin
  select user_id into v_user from public.meal_logs where id = NEW.meal_log_id;
  select coalesce((select (logged_at at time zone 'utc')::date from public.meal_logs where id = NEW.meal_log_id), now()::date) into v_day;

  update public.day_rollups dr
     set kcal      = dr.kcal      + coalesce(NEW.kcal,0),
         protein_g = dr.protein_g + coalesce(NEW.protein_g,0),
         carbs_g   = dr.carbs_g   + coalesce(NEW.carbs_g,0),
         fat_g     = dr.fat_g     + coalesce(NEW.fat_g,0),
         fiber_g   = dr.fiber_g   + coalesce(NEW.fiber_g,0)
   where dr.user_id = v_user and dr.day = v_day;

  if not found then
    insert into public.day_rollups (user_id, day, kcal, protein_g, carbs_g, fat_g, fiber_g)
    values (v_user, v_day,
            coalesce(NEW.kcal,0), coalesce(NEW.protein_g,0),
            coalesce(NEW.carbs_g,0), coalesce(NEW.fat_g,0),
            coalesce(NEW.fiber_g,0));
  end if;
  return NEW;
end $$;

drop trigger if exists trg_meal_items_rollup on public.meal_items;
create trigger trg_meal_items_rollup
after insert on public.meal_items
for each row execute function public.fn_update_day_rollups();

-- 6) Optional: user daily fiber target (dashboard progress)
alter table if exists public.user_metrics
  add column if not exists fiber_target_g numeric;

-- 7) View for dashboard (one row per user/day with fiber)
create or replace view public.v_daily_macros as
select user_id, day, kcal, protein_g, carbs_g, fat_g, fiber_g
from public.day_rollups;

-- 8) RLS policies (adjust to your policy style)
alter table public.food_unit_defaults enable row level security;
alter table public.food_cache enable row level security;
alter table public.macro_payloads enable row level security;
alter table public.day_rollups enable row level security;

create policy if not exists "read_defaults" on public.food_unit_defaults
  for select using (auth.role() = 'authenticated');

create policy if not exists "read_cache" on public.food_cache
  for select using (auth.role() = 'authenticated');

create policy if not exists "user_rw_payloads" on public.macro_payloads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy if not exists "user_read_rollups" on public.day_rollups
  for select using (user_id = auth.uid());

-- 9) RPCs for Macro swarm (staging + atomic logging)

create or replace function public.macro_set_payload(p_session_id uuid, p_user_id uuid, p_payload jsonb)
returns boolean language plpgsql security definer as $$
begin
  update public.macro_payloads set consumed = true
    where session_id = p_session_id and user_id = p_user_id and consumed = false;
  insert into public.macro_payloads (session_id, user_id, payload, consumed)
  values (p_session_id, p_user_id, p_payload, false);
  return true;
end $$;

create or replace function public.macro_get_unconsumed_payload(p_session_id uuid, p_user_id uuid)
returns jsonb language sql security definer as $$
  select payload from public.macro_payloads
   where session_id = p_session_id and user_id = p_user_id and consumed = false
   limit 1;
$$;

create or replace function public.macro_consume_and_log(
  p_session_id uuid,
  p_user_id uuid,
  p_meal_slot text default null,
  p_logged_at timestamptz default now()
) returns uuid language plpgsql security definer as $$
declare
  v_payload jsonb;
  v_log_id uuid;
begin
  select payload into v_payload
    from public.macro_payloads
   where session_id = p_session_id
     and user_id = p_user_id
     and consumed = false
   for update skip locked;

  if v_payload is null then
    raise exception 'No unconsumed macro payload';
  end if;

  insert into public.meal_logs (user_id, meal_slot, logged_at, basis)
  values (p_user_id, coalesce(p_meal_slot,'unknown'), p_logged_at, 'cooked')
  returning id into v_log_id;

  insert into public.meal_items (meal_log_id, name, qty, unit, brand, grams_used, basis, kcal, protein_g, carbs_g, fat_g, fiber_g)
  select
    v_log_id,
    (i->>'name'),
    (i->>'qty')::numeric,
    nullif(i->>'unit',''),
    nullif(i->>'brand',''),
    (i->>'grams_used')::numeric,
    coalesce(i->>'basis','cooked'),
    (i->>'kcal')::numeric,
    (i->>'protein_g')::numeric,
    (i->>'carbs_g')::numeric,
    (i->>'fat_g')::numeric,
    coalesce((i->>'fiber_g')::numeric, 0)
  from jsonb_array_elements(coalesce(v_payload->'items','[]'::jsonb)) as i;

  update public.macro_payloads
     set consumed = true
   where session_id = p_session_id and user_id = p_user_id and consumed = false;

  return v_log_id;
end $$;
