/*
  # Fix RPC Conflict: get_or_create_active_session

  1. Problem
    - Multiple overloaded signatures exist for get_or_create_active_session
    - Causes PGRST203 errors when client tries to call the function
    - chat_messages FK constraint failures (23503) due to session creation failures

  2. Solution
    - Drop all existing versions
    - Create single canonical function with p_user_id and p_session_type parameters
    - Uses timezone-aware session dating
    - Returns session_id (uuid) only for simplicity

  3. Security
    - Function is SECURITY DEFINER (runs with creator permissions)
    - Authenticated users can call it
    - No RLS bypass risk - only creates sessions for auth.uid()
*/

-- Drop all existing versions (order matters due to dependencies)
DROP FUNCTION IF EXISTS public.get_or_create_active_session(uuid, text);
DROP FUNCTION IF EXISTS public.get_or_create_active_session(uuid);

-- Create single canonical version
CREATE OR REPLACE FUNCTION public.get_or_create_active_session(
  p_user_id uuid,
  p_session_type text DEFAULT 'general'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timezone TEXT;
  v_current_date DATE;
  v_session_id UUID;
BEGIN
  -- Security: ensure user is authenticated and can only create their own sessions
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Cannot create session for another user';
  END IF;

  -- Get user's timezone from preferences (default EST)
  SELECT COALESCE(timezone, 'America/New_York')
  INTO v_timezone
  FROM user_preferences
  WHERE user_id = p_user_id;

  -- If no preference row, use EST
  IF v_timezone IS NULL THEN
    v_timezone := 'America/New_York';
  END IF;

  -- Get current date in user's timezone
  v_current_date := (NOW() AT TIME ZONE v_timezone)::DATE;

  -- Try to find existing session for today
  SELECT id
  INTO v_session_id
  FROM chat_sessions
  WHERE user_id = p_user_id
    AND session_date = v_current_date
    AND session_type = p_session_type
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no session for today, create one
  IF v_session_id IS NULL THEN
    INSERT INTO chat_sessions (
      user_id,
      session_type,
      session_date,
      active,
      created_at
    )
    VALUES (
      p_user_id,
      p_session_type,
      v_current_date,
      true,
      NOW()
    )
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_active_session(uuid, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_or_create_active_session(uuid, text) IS 'Get or create chat session for user. Returns session_id. Timezone-aware, creates one session per day per type.';
