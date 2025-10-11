/*
  # Mark Admin Account TDEE as Completed

  ## Purpose
  Admin account (info@hipat.app) is for programming/testing only.
  It should bypass the TDEE wizard entirely.

  ## Changes
  1. Mark `has_completed_tdee = true` for info@hipat.app
  2. Set placeholder TDEE/BMR values so the app doesn't error
  3. Ensure profile exists with ALL required fields

  ## Notes
  - This is idempotent (safe to run multiple times)
  - Only affects info@hipat.app
  - Leaves TDEE wizard intact for all other users
*/

-- Ensure profile exists for admin user with all required fields
INSERT INTO public.profiles (
  user_id,
  email,
  name,
  has_completed_tdee,
  tdee_data,
  last_tdee_update
)
SELECT 
  id,
  email,
  'Admin',
  true,
  jsonb_build_object(
    'tdee', 2000,
    'bmr', 1600,
    'protein_g', 150,
    'carbs_g', 200,
    'fat_g', 65,
    'calculated_at', now(),
    'note', 'Admin account - TDEE bypass'
  ),
  now()
FROM auth.users
WHERE email = 'info@hipat.app'
ON CONFLICT (user_id) DO UPDATE
SET
  has_completed_tdee = true,
  tdee_data = jsonb_build_object(
    'tdee', 2000,
    'bmr', 1600,
    'protein_g', 150,
    'carbs_g', 200,
    'fat_g', 65,
    'calculated_at', now(),
    'note', 'Admin account - TDEE bypass'
  ),
  last_tdee_update = now();

-- Ensure user_metrics exists for admin user with placeholder values
INSERT INTO public.user_metrics (
  user_id,
  tdee,
  bmr,
  protein_g,
  carbs_g,
  fat_g,
  fiber_g_target,
  updated_at
)
SELECT 
  id,
  2000,
  1600,
  150,
  200,
  65,
  30,
  now()
FROM auth.users
WHERE email = 'info@hipat.app'
ON CONFLICT (user_id) DO UPDATE
SET
  tdee = 2000,
  bmr = 1600,
  protein_g = 150,
  carbs_g = 200,
  fat_g = 65,
  fiber_g_target = 30,
  updated_at = now();
