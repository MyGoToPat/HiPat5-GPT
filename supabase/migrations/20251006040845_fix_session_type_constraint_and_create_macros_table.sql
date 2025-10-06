/*
  # Phase 1: Fix session_type constraint and create chat_message_macros table

  ## Changes
  
  1. Session Type Constraint
    - Drop old constraint checking for ('user_chat', 'admin_test', 'onboarding')
    - Add new constraint checking for ('general', 'tmwya', 'workout', 'mmb')
    - Update default from 'user_chat' to 'general'
    - Migrate existing data: 'user_chat' → 'general', 'onboarding' → 'general'
  
  2. New Table: chat_message_macros
    - Stores full structured macro payloads linked to chat messages
    - Enables 48h actionable window + indefinite archive
    - Foreign keys to chat_messages and chat_sessions with cascade delete
    - Indexes on session_id + created_at for retention queries
    - Indexes on message_id for fast lookups
  
  3. Update get_or_create_active_session RPC
    - Change session_type from 'chat' to 'general'
    - Remove filter on session_type (allow any active session)
  
  ## Security
  - RLS enabled on chat_message_macros
  - Users can only access their own macro data via session ownership
  
  ## Rollback Instructions
  To rollback this migration:
  1. Run the DOWN migration: 20251006030000_rollback_session_type_and_macros
  2. Restore session_type values from backup if needed
*/

-- ============================================================================
-- 1. BACKUP existing session_type values for rollback
-- ============================================================================

CREATE TABLE IF NOT EXISTS public._migration_backup_session_types (
  session_id uuid PRIMARY KEY,
  old_session_type text,
  backed_up_at timestamptz DEFAULT now()
);

INSERT INTO public._migration_backup_session_types (session_id, old_session_type)
SELECT id, session_type FROM public.chat_sessions
ON CONFLICT (session_id) DO NOTHING;

-- ============================================================================
-- 2. UPDATE session_type constraint
-- ============================================================================

-- Drop old constraint
ALTER TABLE public.chat_sessions 
  DROP CONSTRAINT IF EXISTS chat_sessions_session_type_check;

-- Migrate existing data
UPDATE public.chat_sessions 
SET session_type = 'general' 
WHERE session_type IN ('user_chat', 'onboarding', 'admin_test');

-- Add new constraint
ALTER TABLE public.chat_sessions 
  ADD CONSTRAINT chat_sessions_session_type_check 
  CHECK (session_type IN ('general', 'tmwya', 'workout', 'mmb'));

-- Update default
ALTER TABLE public.chat_sessions 
  ALTER COLUMN session_type SET DEFAULT 'general';

-- ============================================================================
-- 3. CREATE chat_message_macros table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_message_macros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  basis text NOT NULL DEFAULT 'cooked',
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_cmm_session_time 
  ON public.chat_message_macros(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cmm_message 
  ON public.chat_message_macros(message_id);

CREATE INDEX IF NOT EXISTS idx_cmm_consumed 
  ON public.chat_message_macros(session_id, consumed, created_at DESC)
  WHERE consumed = false;

-- ============================================================================
-- 4. ENABLE RLS on chat_message_macros
-- ============================================================================

ALTER TABLE public.chat_message_macros ENABLE ROW LEVEL SECURITY;

-- Users can read their own macro data
CREATE POLICY "Users can read own macro data"
  ON public.chat_message_macros FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_message_macros.session_id
      AND cs.user_id = auth.uid()
    )
  );

-- Users can insert their own macro data
CREATE POLICY "Users can insert own macro data"
  ON public.chat_message_macros FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_message_macros.session_id
      AND cs.user_id = auth.uid()
    )
  );

-- Users can update their own macro data (for consumed flag)
CREATE POLICY "Users can update own macro data"
  ON public.chat_message_macros FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_message_macros.session_id
      AND cs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_message_macros.session_id
      AND cs.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. UPDATE get_or_create_active_session RPC
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
  -- Try to find an active session (any type)
  SELECT cs.id INTO v_session_id
  FROM public.chat_sessions cs
  WHERE cs.user_id = p_user_id 
    AND cs.active = true
  ORDER BY cs.started_at DESC
  LIMIT 1;

  -- If no active session, create one with type 'general'
  IF v_session_id IS NULL THEN
    INSERT INTO public.chat_sessions (user_id, started_at, active, session_type, created_at)
    VALUES (p_user_id, now(), true, 'general', now())
    RETURNING chat_sessions.id INTO v_session_id;
  END IF;

  -- Return the session
  RETURN QUERY
  SELECT cs.id, cs.user_id, cs.started_at, cs.ended_at, cs.active, cs.session_type, cs.metadata, cs.created_at
  FROM public.chat_sessions cs
  WHERE cs.id = v_session_id;
END;
$$;

-- Ensure permissions are set
GRANT EXECUTE ON FUNCTION public.get_or_create_active_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_active_session(uuid) TO anon;

-- ============================================================================
-- 6. ADD helper function to mark macros as consumed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_macro_payload_consumed(
  p_message_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated boolean;
BEGIN
  -- Mark the macro payload as consumed, but only if user owns it
  UPDATE public.chat_message_macros cmm
  SET consumed = true, updated_at = now()
  WHERE cmm.message_id = p_message_id
    AND EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = cmm.session_id AND cs.user_id = p_user_id
    );
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_macro_payload_consumed(uuid, uuid) TO authenticated;

COMMENT ON TABLE public.chat_message_macros IS 'Stores structured macro payloads from chat messages. Enables 48h actionable window for logging without re-computation.';
COMMENT ON COLUMN public.chat_message_macros.consumed IS 'Set to true after user logs these macros to prevent double-logging';
COMMENT ON COLUMN public.chat_message_macros.basis IS 'Cooking basis used: cooked, raw, or as-served';
