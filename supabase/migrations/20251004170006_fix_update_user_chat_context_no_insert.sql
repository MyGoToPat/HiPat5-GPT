/*
  # Fix update_user_chat_context Function - Remove INSERT Logic

  ## Problem
  Similar to `mark_tdee_completed`, the `update_user_chat_context` function
  was trying to INSERT new profile rows when a profile didn't exist. This causes
  the same NOT NULL constraint violations on `email` and `name` columns.

  ## Solution
  - Remove the INSERT fallback logic from `update_user_chat_context`
  - The function should ONLY update existing profiles
  - If profile doesn't exist, silently fail (log warning but don't error)
  
  ## Changes
  - Update `update_user_chat_context` function to only UPDATE, never INSERT
  - Log a warning if profile doesn't exist but don't raise an exception
    (this function is called on every chat, so we don't want to break the chat flow)
*/

-- Drop and recreate the update_user_chat_context function without INSERT logic
CREATE OR REPLACE FUNCTION public.update_user_chat_context(
  p_user_id uuid,
  p_feature_shown text DEFAULT NULL
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
    chat_count = COALESCE(chat_count, 0) + 1,
    last_chat_at = now(),
    features_seen = CASE
      WHEN p_feature_shown IS NOT NULL THEN
        COALESCE(features_seen, '[]'::jsonb) || to_jsonb(p_feature_shown)
      ELSE features_seen
    END
  WHERE user_id = p_user_id;
  
  -- Check if update was successful
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  
  IF v_rows_updated = 0 THEN
    -- Profile doesn't exist - log warning but don't error
    -- This allows chat to continue even if profile is missing
    RAISE WARNING 'Profile not found for user_id: %. Chat context not updated.', p_user_id;
  END IF;
END;
$$;