/*
  # Fix log_meal RPC enum casting

  1. Changes
    - Replace log_meal function to properly cast text → meal_slot_enum
    - Make function null-safe for all parameters
    - Handle JSON → rows conversion robustly
    - Add numeric coercions for all macro fields
  
  2. Security
    - Keeps SECURITY DEFINER (RLS bypass as intended)
    - Uses auth.uid() for user_id
    - Grants execute to authenticated users only
*/

-- Drop existing function first (with all possible signatures)
drop function if exists public.log_meal(timestamptz, text, text, jsonb);
drop function if exists public.log_meal(jsonb, jsonb, text, text, timestamptz);

-- Create fixed version with proper enum casting
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
  insert into meal_items (
    meal_log_id, position, name, quantity, unit,
    energy_kcal, protein_g, fat_g, carbs_g, fiber_g
  )
  select
    v_log_id,
    coalesce((i->>'position')::int, row_number() over()),
    i->>'name',
    nullif(i->>'quantity','')::numeric,
    i->>'unit',
    nullif(i->>'energy_kcal','')::numeric,
    nullif(i->>'protein_g','')::numeric,
    nullif(i->>'fat_g','')::numeric,
    nullif(i->>'carbs_g','')::numeric,
    nullif(i->>'fiber_g','')::numeric
  from jsonb_array_elements(p_items) as i;

  return v_log_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.log_meal(timestamptz, text, text, jsonb)
  to authenticated;
