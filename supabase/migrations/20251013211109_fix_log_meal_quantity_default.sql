/*
  # Fix log_meal RPC - Handle quantity NULL default

  1. Changes
    - Update log_meal RPC to default quantity to 1 if null/empty
    - Ensures quantity is never NULL (column is NOT NULL)

  2. Security
    - Keeps existing SECURITY DEFINER and grants
*/

-- Drop and recreate with fix
drop function if exists public.log_meal(timestamptz, text, text, jsonb);

create or replace function public.log_meal(
  p_ts                timestamptz,
  p_meal_slot_text    text default null,
  p_note              text default null,
  p_items             jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_log_id    uuid;
  v_meal_slot meal_slot_enum := null;
begin
  -- Safe cast from text to enum (or keep NULL)
  if p_meal_slot_text is not null and p_meal_slot_text != '' then
    v_meal_slot := lower(trim(p_meal_slot_text))::meal_slot_enum;
  end if;

  -- Insert meal log
  insert into meal_logs (user_id, ts, meal_slot, note)
  values (v_user_id, coalesce(p_ts, now()), v_meal_slot, p_note)
  returning id into v_log_id;

  -- Insert items with null-safe numeric conversions
  -- CRITICAL: quantity defaults to 1 if null/empty (column is NOT NULL)
  insert into meal_items (
    meal_log_id, position, name, quantity, unit,
    energy_kcal, protein_g, fat_g, carbs_g, fiber_g
  )
  select
    v_log_id,
    coalesce((i->>'position')::int, row_number() over()),
    i->>'name',
    coalesce(nullif(i->>'quantity','')::numeric, 1),  -- DEFAULT TO 1
    i->>'unit',
    coalesce(nullif(i->>'energy_kcal','')::numeric, 0),
    coalesce(nullif(i->>'protein_g','')::numeric, 0),
    coalesce(nullif(i->>'fat_g','')::numeric, 0),
    coalesce(nullif(i->>'carbs_g','')::numeric, 0),
    coalesce(nullif(i->>'fiber_g','')::numeric, 0)
  from jsonb_array_elements(p_items) as i;

  return v_log_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.log_meal(timestamptz, text, text, jsonb)
  to authenticated;
