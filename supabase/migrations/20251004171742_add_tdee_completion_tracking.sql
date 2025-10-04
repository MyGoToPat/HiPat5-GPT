/*
  # Add Automatic TDEE Completion Tracking

  ## Problem
  When users complete the TDEE wizard:
  - Data is saved to `user_metrics` table
  - BUT `profiles.has_completed_tdee` is never updated
  - Red bubble keeps appearing because it checks `profiles.has_completed_tdee`
  
  ## Solution
  1. Create a trigger that automatically sets `profiles.has_completed_tdee = true`
     whenever `user_metrics` is updated with TDEE/BMR values
  2. Update `get_user_context_flags` to check BOTH sources:
     - `profiles.has_completed_tdee` flag
     - `user_metrics` has valid TDEE data
  3. Backfill existing users who have metrics but flag is false

  ## Changes
  - Add trigger function `sync_tdee_completion_to_profile()`
  - Create trigger on `user_metrics` INSERT/UPDATE
  - Update `get_user_context_flags()` to check both tables
  - Backfill existing data
*/

-- Function to sync TDEE completion status from user_metrics to profiles
CREATE OR REPLACE FUNCTION public.sync_tdee_completion_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If user_metrics has TDEE and BMR data, mark profile as completed
  IF NEW.tdee IS NOT NULL AND NEW.bmr IS NOT NULL THEN
    UPDATE public.profiles
    SET
      has_completed_tdee = true,
      tdee_data = jsonb_build_object(
        'tdee', NEW.tdee,
        'bmr', NEW.bmr,
        'protein_g', NEW.protein_g,
        'carbs_g', NEW.carbs_g,
        'fat_g', NEW.fat_g,
        'calculated_at', COALESCE(NEW.updated_at, now())
      ),
      last_tdee_update = COALESCE(NEW.updated_at, now())
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically sync TDEE completion status
DROP TRIGGER IF EXISTS on_user_metrics_tdee_update ON user_metrics;

CREATE TRIGGER on_user_metrics_tdee_update
  AFTER INSERT OR UPDATE OF tdee, bmr ON user_metrics
  FOR EACH ROW
  WHEN (NEW.tdee IS NOT NULL AND NEW.bmr IS NOT NULL)
  EXECUTE FUNCTION public.sync_tdee_completion_to_profile();

-- Update get_user_context_flags to check BOTH sources
CREATE OR REPLACE FUNCTION public.get_user_context_flags(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_has_tdee boolean;
  v_tdee_age numeric;
BEGIN
  -- Check if user has TDEE from EITHER profiles flag OR user_metrics data
  SELECT 
    COALESCE(p.has_completed_tdee, false) OR (um.tdee IS NOT NULL AND um.bmr IS NOT NULL),
    CASE
      WHEN p.last_tdee_update IS NOT NULL THEN
        EXTRACT(EPOCH FROM (now() - p.last_tdee_update)) / 86400
      WHEN um.updated_at IS NOT NULL AND um.tdee IS NOT NULL THEN
        EXTRACT(EPOCH FROM (now() - um.updated_at)) / 86400
      ELSE NULL
    END
  INTO v_has_tdee, v_tdee_age
  FROM public.profiles p
  LEFT JOIN public.user_metrics um ON um.user_id = p.user_id
  WHERE p.user_id = p_user_id;

  -- Build the result object
  SELECT jsonb_build_object(
    'isFirstTimeChat', COALESCE(chat_count, 0) = 0,
    'hasTDEE', COALESCE(v_has_tdee, false),
    'tdeeAge', v_tdee_age,
    'chatCount', COALESCE(chat_count, 0),
    'featuresSeen', COALESCE(features_seen, '[]'::jsonb),
    'onboardingComplete', COALESCE(onboarding_complete, false)
  ) INTO v_result
  FROM public.profiles
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'isFirstTimeChat', true,
    'hasTDEE', false,
    'tdeeAge', NULL,
    'chatCount', 0,
    'featuresSeen', '[]'::jsonb,
    'onboardingComplete', false
  ));
END;
$$;

-- Backfill: Update profiles for users who have metrics but flag is false
UPDATE public.profiles p
SET
  has_completed_tdee = true,
  tdee_data = jsonb_build_object(
    'tdee', um.tdee,
    'bmr', um.bmr,
    'protein_g', um.protein_g,
    'carbs_g', um.carbs_g,
    'fat_g', um.fat_g,
    'calculated_at', um.updated_at
  ),
  last_tdee_update = um.updated_at
FROM public.user_metrics um
WHERE p.user_id = um.user_id
  AND um.tdee IS NOT NULL
  AND um.bmr IS NOT NULL
  AND (p.has_completed_tdee = false OR p.has_completed_tdee IS NULL);