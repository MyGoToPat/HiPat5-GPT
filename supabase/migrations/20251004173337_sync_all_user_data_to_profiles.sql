/*
  # Sync ALL User Data from user_metrics to profiles

  ## Problem
  When users complete TDEE onboarding:
  - Data saved to `user_metrics` table (age, gender, height_cm, weight_kg, body_fat, etc.)
  - BUT `profiles` table fields remain NULL:
    - onboarding_complete = false
    - protein_g_override = NULL
    - carb_g_override = NULL
    - fat_g_override = NULL
    - height_inches = NULL
    - weight_lbs = NULL
    - body_fat_percent = NULL
    - activity_level = NULL
    - bmr_value = NULL
    - tdee_value = NULL
  
  ## Solution
  1. Update trigger to sync ALL fields from user_metrics to profiles
  2. Handle unit conversion (metric to imperial)
  3. Set onboarding_complete = true when TDEE is completed
  4. Backfill existing users

  ## Changes
  - Enhanced `sync_tdee_completion_to_profile()` to sync all fields
  - Convert kg → lbs, cm → inches
  - Set onboarding_complete flag
  - Backfill all existing user data
*/

-- Enhanced function to sync ALL user data from user_metrics to profiles
CREATE OR REPLACE FUNCTION public.sync_tdee_completion_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If user_metrics has TDEE and BMR data, sync everything to profiles
  IF NEW.tdee IS NOT NULL AND NEW.bmr IS NOT NULL THEN
    UPDATE public.profiles
    SET
      -- TDEE completion flags
      has_completed_tdee = true,
      onboarding_complete = true,
      
      -- TDEE values
      bmr_value = NEW.bmr,
      tdee_value = NEW.tdee,
      
      -- Macros (sync to override fields in profiles)
      protein_g_override = NEW.protein_g,
      carb_g_override = NEW.carbs_g,
      fat_g_override = NEW.fat_g,
      last_macro_update = COALESCE(NEW.updated_at, now()),
      
      -- Personal metrics (convert metric to imperial)
      weight_lbs = CASE 
        WHEN NEW.weight_kg IS NOT NULL THEN NEW.weight_kg::numeric * 2.20462
        ELSE weight_lbs
      END,
      height_inches = CASE 
        WHEN NEW.height_cm IS NOT NULL THEN NEW.height_cm::numeric / 2.54
        ELSE height_inches
      END,
      body_fat_percent = COALESCE(NEW.body_fat_percent, body_fat_percent),
      activity_level = COALESCE(NEW.activity_level, activity_level),
      
      -- TDEE data JSON
      tdee_data = jsonb_build_object(
        'tdee', NEW.tdee,
        'bmr', NEW.bmr,
        'protein_g', NEW.protein_g,
        'carbs_g', NEW.carbs_g,
        'fat_g', NEW.fat_g,
        'age', NEW.age,
        'gender', NEW.gender,
        'height_cm', NEW.height_cm,
        'weight_kg', NEW.weight_kg,
        'body_fat_percent', NEW.body_fat_percent,
        'activity_level', NEW.activity_level,
        'calculated_at', COALESCE(NEW.updated_at, now())
      ),
      last_tdee_update = COALESCE(NEW.updated_at, now()),
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Backfill: Sync ALL existing user_metrics data to profiles
UPDATE public.profiles p
SET
  -- TDEE completion flags
  has_completed_tdee = true,
  onboarding_complete = true,
  
  -- TDEE values
  bmr_value = um.bmr,
  tdee_value = um.tdee,
  
  -- Macros
  protein_g_override = um.protein_g,
  carb_g_override = um.carbs_g,
  fat_g_override = um.fat_g,
  last_macro_update = um.updated_at,
  
  -- Personal metrics (convert metric to imperial)
  weight_lbs = CASE 
    WHEN um.weight_kg IS NOT NULL THEN um.weight_kg::numeric * 2.20462
    ELSE p.weight_lbs
  END,
  height_inches = CASE 
    WHEN um.height_cm IS NOT NULL THEN um.height_cm::numeric / 2.54
    ELSE p.height_inches
  END,
  body_fat_percent = COALESCE(um.body_fat_percent, p.body_fat_percent),
  activity_level = COALESCE(um.activity_level, p.activity_level),
  
  -- TDEE data JSON
  tdee_data = jsonb_build_object(
    'tdee', um.tdee,
    'bmr', um.bmr,
    'protein_g', um.protein_g,
    'carbs_g', um.carbs_g,
    'fat_g', um.fat_g,
    'age', um.age,
    'gender', um.gender,
    'height_cm', um.height_cm,
    'weight_kg', um.weight_kg,
    'body_fat_percent', um.body_fat_percent,
    'activity_level', um.activity_level,
    'calculated_at', um.updated_at
  ),
  last_tdee_update = um.updated_at,
  updated_at = now()
FROM public.user_metrics um
WHERE p.user_id = um.user_id
  AND um.tdee IS NOT NULL
  AND um.bmr IS NOT NULL;