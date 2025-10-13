/*
  # Fix recompute_meal_totals function to use correct schema

  1. Changes
    - Update recompute_meal_totals to reference meal_log_id (not meal_id)
    - Update to reference meal_logs table (not meals)
    - Update to set totals JSONB field (not individual columns)
    - Compute dual-key totals (kcal + calories)

  2. Security
    - Function is called by triggers, no direct access needed
*/

-- Drop and recreate with correct schema references
drop function if exists public.recompute_meal_totals(uuid);

create or replace function public.recompute_meal_totals(p_meal_log_id uuid)
returns void
language sql
as $$
  with s as (
    select
      coalesce(sum(energy_kcal),0) as kcal,
      coalesce(sum(protein_g),0)   as protein_g,
      coalesce(sum(carbs_g),0)     as carbs_g,
      coalesce(sum(fat_g),0)       as fat_g,
      coalesce(sum(fiber_g),0)     as fiber_g
    from public.meal_items
    where meal_log_id = p_meal_log_id
  )
  update public.meal_logs ml
  set totals = jsonb_build_object(
    'kcal', s.kcal,
    'calories', s.kcal,
    'protein_g', s.protein_g,
    'carbs_g', s.carbs_g,
    'fat_g', s.fat_g,
    'fiber_g', s.fiber_g
  ),
  micros_totals = jsonb_build_object(
    'fiber_g', s.fiber_g
  )
  from s
  where ml.id = p_meal_log_id;
$$;
