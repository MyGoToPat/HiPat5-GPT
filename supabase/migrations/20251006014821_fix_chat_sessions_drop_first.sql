/*
  # Safely fix chat sessions and messages schema

  1. Drop existing function if present
  2. Session Management RPC
    - Create get_or_create_active_session function
    - Returns active session or creates new one

  3. Handle orphaned messages
    - Delete messages without user_id (cannot be linked)
    - Create sessions for remaining messages
    
  4. Changes to chat_messages
    - Make session_id NOT NULL
    - Drop chat_history_id column
    - Add foreign key to chat_sessions
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_or_create_active_session(uuid);

-- Create get_or_create_active_session RPC
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
  -- Try to find an active session
  SELECT cs.id INTO v_session_id
  FROM public.chat_sessions cs
  WHERE cs.user_id = p_user_id 
    AND cs.active = true
    AND cs.session_type = 'chat'
  ORDER BY cs.started_at DESC
  LIMIT 1;

  -- If no active session, create one
  IF v_session_id IS NULL THEN
    INSERT INTO public.chat_sessions (user_id, started_at, active, session_type, created_at)
    VALUES (p_user_id, now(), true, 'chat', now())
    RETURNING chat_sessions.id INTO v_session_id;
  END IF;

  -- Return the session
  RETURN QUERY
  SELECT cs.id, cs.user_id, cs.started_at, cs.ended_at, cs.active, cs.session_type, cs.metadata, cs.created_at
  FROM public.chat_sessions cs
  WHERE cs.id = v_session_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_or_create_active_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_active_session(uuid) TO anon;

-- Delete orphaned messages that have no user_id
DELETE FROM public.chat_messages WHERE user_id IS NULL;

-- For remaining messages with user_id but no session_id, create sessions
DO $$
DECLARE
  orphan_record RECORD;
  new_session_id uuid;
BEGIN
  FOR orphan_record IN 
    SELECT DISTINCT user_id, MIN(timestamp) as first_msg_time
    FROM public.chat_messages 
    WHERE session_id IS NULL AND user_id IS NOT NULL
    GROUP BY user_id
  LOOP
    -- Create a session for this user
    INSERT INTO public.chat_sessions (user_id, started_at, active, session_type, created_at)
    VALUES (orphan_record.user_id, orphan_record.first_msg_time, false, 'chat', now())
    RETURNING id INTO new_session_id;
    
    -- Link all messages from this user with no session_id
    UPDATE public.chat_messages
    SET session_id = new_session_id
    WHERE user_id = orphan_record.user_id AND session_id IS NULL;
  END LOOP;
END $$;

-- Make session_id NOT NULL
ALTER TABLE public.chat_messages 
  ALTER COLUMN session_id SET NOT NULL;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_chat_messages_session'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT fk_chat_messages_session
      FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on session_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id 
  ON public.chat_messages(session_id);

-- Drop the old chat_history_id column
ALTER TABLE public.chat_messages 
  DROP COLUMN IF EXISTS chat_history_id;
