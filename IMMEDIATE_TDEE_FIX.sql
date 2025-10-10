-- ========================================
-- IMMEDIATE FIX for TDEE "Not completed" Issue
-- ========================================
-- Run this SQL in Supabase SQL Editor NOW to fix the issue immediately
-- This will sync profiles.tdee_data → user_metrics for all affected users

-- Step 1: Check how many users are affected
SELECT
  COUNT(*) FILTER (WHERE p.has_completed_tdee = true) as users_completed_tdee,
  COUNT(*) FILTER (WHERE um.tdee_calories IS NULL OR um.tdee_calories = 0) as users_missing_tdee_calories,
  COUNT(*) FILTER (
    WHERE p.has_completed_tdee = true
    AND (um.tdee_calories IS NULL OR um.tdee_calories = 0)
  ) as users_needing_sync
FROM profiles p
LEFT JOIN user_metrics um ON p.user_id = um.user_id;

-- Step 2: IMMEDIATE FIX - Sync tdee_data from profiles to user_metrics
-- This updates existing user_metrics rows
UPDATE user_metrics um
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
FROM profiles p
WHERE
  um.user_id = p.user_id
  AND p.has_completed_tdee = true
  AND p.tdee_data IS NOT NULL
  AND p.tdee_data->>'tdee' IS NOT NULL
  AND (um.tdee_calories IS NULL OR um.tdee_calories = 0);

-- Step 3: Create user_metrics rows for users who don't have one yet
INSERT INTO user_metrics (
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
FROM profiles p
LEFT JOIN user_metrics um ON um.user_id = p.user_id
WHERE
  p.has_completed_tdee = true
  AND p.tdee_data IS NOT NULL
  AND p.tdee_data->>'tdee' IS NOT NULL
  AND um.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  tdee_calories = EXCLUDED.tdee_calories,
  bmr_calories = EXCLUDED.bmr_calories,
  gender = COALESCE(user_metrics.gender, EXCLUDED.gender),
  age = COALESCE(user_metrics.age, EXCLUDED.age),
  height_cm = COALESCE(user_metrics.height_cm, EXCLUDED.height_cm),
  weight_kg = COALESCE(user_metrics.weight_kg, EXCLUDED.weight_kg),
  body_fat_percent = COALESCE(user_metrics.body_fat_percent, EXCLUDED.body_fat_percent),
  activity_level = COALESCE(user_metrics.activity_level, EXCLUDED.activity_level),
  dietary_preference = COALESCE(user_metrics.dietary_preference, EXCLUDED.dietary_preference),
  last_tdee_update = COALESCE(user_metrics.last_tdee_update, EXCLUDED.last_tdee_update),
  updated_at = now();

-- Step 4: Verify the fix worked
SELECT
  COUNT(*) FILTER (WHERE p.has_completed_tdee = true) as users_completed_tdee,
  COUNT(*) FILTER (WHERE um.tdee_calories IS NOT NULL AND um.tdee_calories > 0) as users_with_tdee_calories,
  COUNT(*) FILTER (
    WHERE p.has_completed_tdee = true
    AND um.tdee_calories IS NOT NULL
    AND um.tdee_calories > 0
  ) as properly_synced,
  CASE
    WHEN COUNT(*) FILTER (WHERE p.has_completed_tdee = true) =
         COUNT(*) FILTER (WHERE p.has_completed_tdee = true AND um.tdee_calories IS NOT NULL AND um.tdee_calories > 0)
    THEN '✅ ALL USERS FIXED!'
    ELSE '⚠️ Some users still have issues'
  END as status
FROM profiles p
LEFT JOIN user_metrics um ON p.user_id = um.user_id;

-- Step 5: Check specific user (any2crds+pat1@gmail.com)
SELECT
  p.email,
  p.has_completed_tdee as completed_in_profiles,
  (p.tdee_data->>'tdee')::numeric as tdee_from_json,
  um.tdee_calories as tdee_in_metrics,
  CASE
    WHEN um.tdee_calories IS NOT NULL AND um.tdee_calories > 0
      THEN '✅ WILL SHOW: ' || ROUND(um.tdee_calories) || ' kcal/day'
    ELSE '❌ WILL SHOW: Not completed'
  END as ui_status
FROM profiles p
LEFT JOIN user_metrics um ON p.user_id = um.user_id
WHERE p.email = 'any2crds+pat1@gmail.com';
