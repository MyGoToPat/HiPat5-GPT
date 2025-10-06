/*
  # HOTFIX: Update get_or_create_active_session to use 'general' instead of 'user_chat'

  CRITICAL BUG FIX: The RPC function was using 'user_chat' but the constraint
  only allows ('general', 'tmwya', 'workout', 'mmb')

  This was causing chat sessions to fail on creation.
*/

-- Update the RPC function to use 'general' instead of 'user_chat'
CREATE OR REPLACE FUNCTION public.get_or_create_active_session(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  active boolean,
  session_type text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Try to find an active session (use 'general' type for user chats)
  SELECT cs.id INTO v_session_id
  FROM public.chat_sessions cs
  WHERE cs.user_id = p_user_id
    AND cs.active = true
    AND cs.session_type = 'general'
  ORDER BY cs.started_at DESC
  LIMIT 1;

  -- If no active session, create one with 'general' type
  IF v_session_id IS NULL THEN
    INSERT INTO public.chat_sessions (user_id, started_at, active, session_type, created_at)
    VALUES (p_user_id, now(), true, 'general', now())
    RETURNING chat_sessions.id INTO v_session_id;
  END IF;

  -- Return the session
  RETURN QUERY
  SELECT
    cs.id,
    cs.user_id,
    cs.started_at,
    cs.ended_at,
    cs.active,
    cs.session_type,
    cs.metadata,
    cs.created_at
  FROM public.chat_sessions cs
  WHERE cs.id = v_session_id;
END;
$$;

-- Update any existing 'user_chat' sessions to 'general' to fix broken sessions
UPDATE public.chat_sessions
SET session_type = 'general'
WHERE session_type = 'user_chat';

COMMENT ON FUNCTION public.get_or_create_active_session IS 'Gets or creates an active chat session for a user. Uses session_type=general for regular user chats.';
