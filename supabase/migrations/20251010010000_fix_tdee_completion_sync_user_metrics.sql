/*
  # Fix TDEE Completion to Sync user_metrics Table

  ## Problem
  The `mark_tdee_completed` function only updates the `profiles` table with TDEE data,
  but the UI reads from `user_metrics.tdee_calories` to check completion status.
  This causes users who completed TDEE to still show "Not completed" in the UI.

  ## Root Cause
  - TDEE completion updates: `profiles.has_completed_tdee` and `profiles.tdee_data` (JSON)
  - UI checks for: `user_metrics.tdee_calories` (number)
  - These are out of sync!

  ## Solution
  1. Update `mark_tdee_completed` function to ALSO update `user_metrics` table
  2. Extract all TDEE values from JSON and write to user_metrics columns
  3. Backfill existing users who have TDEE data but missing user_metrics values

  ## Fields Synced
  - tdee_calories (main completion indicator)
  - bmr_calories
  - gender
  - age
  - height_cm
  - weight_kg
  - body_fat_percent
  - activity_level
  - dietary_preference
  - last_tdee_update
*/

-- Step 1: Update mark_tdee_completed to sync user_metrics
CREATE OR REPLACE FUNCTION public.mark_tdee_completed(
  p_user_id uuid,
  p_tdee_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated integer;
  v_weight_kg numeric;
  v_body_fat_percent numeric;
BEGIN
  -- Extract weight and body fat from tdee_data
  v_weight_kg := (p_tdee_data->>'weight_kg')::numeric;
  v_body_fat_percent := (p_tdee_data->>'body_fat_percent')::numeric;

  -- Update profiles table (existing behavior)
  UPDATE public.profiles
  SET
    has_completed_tdee = true,
    tdee_data = p_tdee_data,
    last_tdee_update = now()
  WHERE user_id = p_user_id;

  -- Check if update was successful
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Profile not found for user_id: %. TDEE completion cannot be saved.', p_user_id;
  END IF;

  -- NEW: Update user_metrics table with all TDEE values
  UPDATE public.user_metrics
  SET
    tdee_calories = (p_tdee_data->>'tdee')::numeric,
    bmr_calories = (p_tdee_data->>'bmr')::numeric,
    gender = (p_tdee_data->>'gender')::text,
    age = (p_tdee_data->>'age')::integer,
    height_cm = (p_tdee_data->>'height_cm')::numeric,
    weight_kg = (p_tdee_data->>'weight_kg')::numeric,
    body_fat_percent = (p_tdee_data->>'body_fat_percent')::numeric,
    activity_level = (p_tdee_data->>'activity_level')::text,
    dietary_preference = (p_tdee_data->>'dietary_preference')::text,
    last_tdee_update = now(),
    updated_at = now()
  WHERE user_id = p_user_id;

  -- If user_metrics doesn't exist yet, create it
  IF NOT FOUND THEN
    INSERT INTO public.user_metrics (
      user_id,
      tdee_calories,
      bmr_calories,
      gender,
      age,
      height_cm,
      weight_kg,
      body_fat_percent,
      activity_level,
      dietary_preference,
      last_tdee_update,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      (p_tdee_data->>'tdee')::numeric,
      (p_tdee_data->>'bmr')::numeric,
      (p_tdee_data->>'gender')::text,
      (p_tdee_data->>'age')::integer,
      (p_tdee_data->>'height_cm')::numeric,
      (p_tdee_data->>'weight_kg')::numeric,
      (p_tdee_data->>'body_fat_percent')::numeric,
      (p_tdee_data->>'activity_level')::text,
      (p_tdee_data->>'dietary_preference')::text,
      now(),
      now(),
      now()
    );
  END IF;

  -- Create initial tracking logs (existing behavior)
  PERFORM create_initial_tracking_logs(p_user_id, v_weight_kg, v_body_fat_percent);
END;
$$;

-- Step 2: Backfill user_metrics for users who completed TDEE but have missing data
-- This fixes the "Not completed" display for existing users
UPDATE public.user_metrics um
SET
  tdee_calories = (p.tdee_data->>'tdee')::numeric,
  bmr_calories = (p.tdee_data->>'bmr')::numeric,
  gender = COALESCE(um.gender, (p.tdee_data->>'gender')::text),
  age = COALESCE(um.age, (p.tdee_data->>'age')::integer),
  height_cm = COALESCE(um.height_cm, (p.tdee_data->>'height_cm')::numeric),
  weight_kg = COALESCE(um.weight_kg, (p.tdee_data->>'weight_kg')::numeric),
  body_fat_percent = COALESCE(um.body_fat_percent, (p.tdee_data->>'body_fat_percent')::numeric),
  activity_level = COALESCE(um.activity_level, (p.tdee_data->>'activity_level')::text),
  dietary_preference = COALESCE(um.dietary_preference, (p.tdee_data->>'dietary_preference')::text),
  last_tdee_update = COALESCE(um.last_tdee_update, p.last_tdee_update),
  updated_at = now()
FROM public.profiles p
WHERE
  um.user_id = p.user_id
  AND p.has_completed_tdee = true
  AND p.tdee_data IS NOT NULL
  AND (
    um.tdee_calories IS NULL
    OR um.tdee_calories = 0
    OR um.tdee_calories != (p.tdee_data->>'tdee')::numeric
  );

-- Step 3: Create user_metrics for users who have TDEE data but no user_metrics row
INSERT INTO public.user_metrics (
  user_id,
  tdee_calories,
  bmr_calories,
  gender,
  age,
  height_cm,
  weight_kg,
  body_fat_percent,
  activity_level,
  dietary_preference,
  last_tdee_update,
  created_at,
  updated_at
)
SELECT
  p.user_id,
  (p.tdee_data->>'tdee')::numeric,
  (p.tdee_data->>'bmr')::numeric,
  (p.tdee_data->>'gender')::text,
  (p.tdee_data->>'age')::integer,
  (p.tdee_data->>'height_cm')::numeric,
  (p.tdee_data->>'weight_kg')::numeric,
  (p.tdee_data->>'body_fat_percent')::numeric,
  (p.tdee_data->>'activity_level')::text,
  (p.tdee_data->>'dietary_preference')::text,
  p.last_tdee_update,
  now(),
  now()
FROM public.profiles p
LEFT JOIN public.user_metrics um ON um.user_id = p.user_id
WHERE
  p.has_completed_tdee = true
  AND p.tdee_data IS NOT NULL
  AND um.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verification - count users with TDEE completion
DO $$
DECLARE
  total_completed INTEGER;
  with_tdee_calories INTEGER;
  fixed_count INTEGER;
BEGIN
  -- Count users who completed TDEE
  SELECT COUNT(*) INTO total_completed
  FROM profiles
  WHERE has_completed_tdee = true;

  -- Count users with tdee_calories set
  SELECT COUNT(*) INTO with_tdee_calories
  FROM user_metrics
  WHERE tdee_calories IS NOT NULL AND tdee_calories > 0;

  -- Count how many were just fixed
  fixed_count := with_tdee_calories;

  RAISE NOTICE 'TDEE Completion Sync Results:';
  RAISE NOTICE '  Users who completed TDEE (profiles): %', total_completed;
  RAISE NOTICE '  Users with tdee_calories (user_metrics): %', with_tdee_calories;
  RAISE NOTICE '  Sync Status: %', CASE
    WHEN total_completed = with_tdee_calories THEN 'PERFECT - All synced!'
    WHEN with_tdee_calories >= total_completed THEN 'OK - Metrics match or exceed'
    ELSE 'WARNING - ' || (total_completed - with_tdee_calories) || ' users still missing tdee_calories'
  END;
END $$;
