/*
  # Add Initial Weight and Body Fat Logs on TDEE Completion

  ## Purpose
  Automatically create first weight and body fat log entries when a user completes
  their TDEE onboarding. This gives them baseline tracking data from day one.

  ## Changes
  1. Create function to log initial weight and body fat
  2. Update mark_tdee_completed to call the logging function
  
  ## Behavior
  - When TDEE is marked as completed, automatically creates:
    - Initial weight_logs entry with current weight
    - Initial body_fat_logs entry with current body fat %
  - Uses log_date = current date
  - Only creates if data doesn't already exist for that date
*/

-- Function to create initial tracking logs
CREATE OR REPLACE FUNCTION public.create_initial_tracking_logs(
  p_user_id uuid,
  p_weight_kg numeric,
  p_body_fat_percent numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today date := CURRENT_DATE;
BEGIN
  -- Create initial weight log if weight exists and no log for today
  IF p_weight_kg IS NOT NULL AND p_weight_kg > 0 THEN
    INSERT INTO public.weight_logs (
      user_id,
      weight_kg,
      weight_lbs,
      logged_unit,
      log_date,
      note
    )
    VALUES (
      p_user_id,
      p_weight_kg,
      p_weight_kg * 2.20462,
      'lbs',  -- Default to lbs
      v_today,
      'Initial TDEE measurement'
    )
    ON CONFLICT (user_id, log_date) DO NOTHING;
  END IF;

  -- Create initial body fat log if body fat exists and no log for today
  IF p_body_fat_percent IS NOT NULL AND p_body_fat_percent > 0 THEN
    INSERT INTO public.body_fat_logs (
      user_id,
      body_fat_percent,
      log_date,
      note
    )
    VALUES (
      p_user_id,
      p_body_fat_percent,
      v_today,
      'Initial TDEE measurement'
    )
    ON CONFLICT (user_id, log_date) DO NOTHING;
  END IF;
END;
$$;

-- Update mark_tdee_completed to also create initial logs
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

  -- Update existing profile
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

  -- Create initial tracking logs
  PERFORM create_initial_tracking_logs(p_user_id, v_weight_kg, v_body_fat_percent);
END;
$$;