/*
  # Fix mark_tdee_completed Function - Remove INSERT Logic

  ## Problem
  The `mark_tdee_completed` function was trying to INSERT new profile rows when
  a profile didn't exist. However, the profiles table has NOT NULL constraints on
  `email` and `name` columns, causing the INSERT to fail with constraint violations.
  
  This prevented TDEE completion from being properly saved to the database, causing
  the red TDEE reminder bubble to reappear after logout/login.

  ## Solution
  - Remove the INSERT fallback logic from `mark_tdee_completed`
  - The function should ONLY update existing profiles
  - A profile must already exist before a user completes the TDEE calculator
  - If profile doesn't exist, log an error but don't try to insert
  
  ## Changes
  - Update `mark_tdee_completed` function to only UPDATE, never INSERT
  - Raise an exception if profile doesn't exist (shouldn't happen in normal flow)
*/

-- Drop and recreate the mark_tdee_completed function without INSERT logic
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
BEGIN
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
    -- Profile doesn't exist - this shouldn't happen in normal flow
    -- Raise an exception so we can catch and log it
    RAISE EXCEPTION 'Profile not found for user_id: %. TDEE completion cannot be saved.', p_user_id;
  END IF;
END;
$$;