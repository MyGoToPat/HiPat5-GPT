-- Diagnostic SQL to investigate TDEE "Not completed" issue
-- Run this in Supabase SQL Editor for user: any2crds+pat1@gmail.com

-- Step 1: Get the user_id
SELECT
  id as user_id,
  email,
  created_at
FROM auth.users
WHERE email = 'any2crds+pat1@gmail.com';

-- Step 2: Check profiles table
SELECT
  user_id,
  email,
  name,
  has_completed_tdee,
  tdee_data,
  last_tdee_update
FROM profiles
WHERE email = 'any2crds+pat1@gmail.com';

-- Step 3: Check user_metrics table
SELECT
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
  protein_g_target,
  carbs_g_target,
  fat_g_target
FROM user_metrics
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'any2crds+pat1@gmail.com'
);

-- Step 4: Check what the UI is actually checking
-- The PersonalInformationSection component checks: metrics.tdee_calories
-- Let's verify what it would see:
SELECT
  CASE
    WHEN um.tdee_calories IS NOT NULL AND um.tdee_calories > 0
      THEN 'SHOULD SHOW: ✅ ' || ROUND(um.tdee_calories) || ' kcal/day'
    ELSE 'SHOWS: ⚠️ Not completed'
  END as ui_display,
  um.tdee_calories,
  p.has_completed_tdee,
  p.tdee_data->>'tdee' as tdee_from_json
FROM profiles p
LEFT JOIN user_metrics um ON p.user_id = um.user_id
WHERE p.email = 'any2crds+pat1@gmail.com';

-- Step 5: Detailed field comparison
SELECT
  'profiles.has_completed_tdee' as field,
  p.has_completed_tdee::text as value
FROM profiles p
WHERE p.email = 'any2crds+pat1@gmail.com'

UNION ALL

SELECT
  'profiles.tdee_data (JSON)' as field,
  p.tdee_data::text as value
FROM profiles p
WHERE p.email = 'any2crds+pat1@gmail.com'

UNION ALL

SELECT
  'user_metrics.tdee_calories' as field,
  COALESCE(um.tdee_calories::text, 'NULL') as value
FROM profiles p
LEFT JOIN user_metrics um ON p.user_id = um.user_id
WHERE p.email = 'any2crds+pat1@gmail.com'

UNION ALL

SELECT
  'user_metrics EXISTS' as field,
  CASE WHEN um.user_id IS NOT NULL THEN 'YES' ELSE 'NO' END as value
FROM profiles p
LEFT JOIN user_metrics um ON p.user_id = um.user_id
WHERE p.email = 'any2crds+pat1@gmail.com';
