/*
  # ROLLBACK: Phase 1 Database Changes
  
  This migration rolls back:
  1. chat_message_macros table and related functions
  2. session_type constraint changes
  3. get_or_create_active_session RPC changes
  
  ## WARNING
  Running this rollback will:
  - DROP all macro payload data in chat_message_macros
  - Revert session_type values to old system
  - Restore old RPC behavior
  
  ## To Apply Rollback
  This migration is kept for emergency use only.
  To apply: Rename this file to have a newer timestamp than the forward migration.
*/

-- ============================================================================
-- 1. DROP helper functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.mark_macro_payload_consumed(uuid, uuid);

-- ============================================================================
-- 2. DROP chat_message_macros table
-- ============================================================================

DROP TABLE IF EXISTS public.chat_message_macros CASCADE;

-- ============================================================================
-- 3. RESTORE old session_type constraint
-- ============================================================================

-- Drop new constraint
ALTER TABLE public.chat_sessions 
  DROP CONSTRAINT IF EXISTS chat_sessions_session_type_check;

-- Restore old session types from backup if available
UPDATE public.chat_sessions cs
SET session_type = backup.old_session_type
FROM public._migration_backup_session_types backup
WHERE cs.id = backup.session_id
  AND backup.old_session_type IS NOT NULL;

-- For any sessions not in backup (created after migration), set to 'user_chat'
UPDATE public.chat_sessions
SET session_type = 'user_chat'
WHERE session_type = 'general';

-- Add old constraint
ALTER TABLE public.chat_sessions 
  ADD CONSTRAINT chat_sessions_session_type_check 
  CHECK (session_type IN ('user_chat', 'admin_test', 'onboarding'));

-- Restore old default
ALTER TABLE public.chat_sessions 
  ALTER COLUMN session_type SET DEFAULT 'user_chat';

-- ============================================================================
-- 4. RESTORE old get_or_create_active_session RPC
-- ============================================================================

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
    AND cs.session_type = 'user_chat'
  ORDER BY cs.started_at DESC
  LIMIT 1;

  -- If no active session, create one
  IF v_session_id IS NULL THEN
    INSERT INTO public.chat_sessions (user_id, started_at, active, session_type, created_at)
    VALUES (p_user_id, now(), true, 'user_chat', now())
    RETURNING chat_sessions.id INTO v_session_id;
  END IF;

  -- Return the session
  RETURN QUERY
  SELECT cs.id, cs.user_id, cs.started_at, cs.ended_at, cs.active, cs.session_type, cs.metadata, cs.created_at
  FROM public.chat_sessions cs
  WHERE cs.id = v_session_id;
END;
$$;

-- ============================================================================
-- 5. CLEANUP backup table
-- ============================================================================

DROP TABLE IF EXISTS public._migration_backup_session_types;

COMMENT ON FUNCTION public.get_or_create_active_session IS 'ROLLED BACK: Returns to old session_type behavior';
