/*
  # Fix session_type to use 'general' consistently

  1. Update client code expectations
    - Client code (src/lib/chatSessions.ts) references 'user_chat'
    - Database constraint allows ('general', 'tmwya', 'workout', 'mmb')
    - Migration 20251006040845 already migrated 'user_chat' → 'general'

  2. This migration ensures consistency going forward
    - Verify all sessions use valid session_type values
    - Add comment documenting the migration path
*/

-- Verify constraint is correct (should already be in place from 20251006040845)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_sessions_session_type_check'
    AND contype = 'c'
  ) THEN
    ALTER TABLE public.chat_sessions
      ADD CONSTRAINT chat_sessions_session_type_check
      CHECK (session_type IN ('general', 'tmwya', 'workout', 'mmb'));
  END IF;
END $$;

-- Ensure default is 'general'
ALTER TABLE public.chat_sessions
  ALTER COLUMN session_type SET DEFAULT 'general';

-- Migrate any remaining 'user_chat', 'admin_test', 'onboarding' to 'general'
UPDATE public.chat_sessions
SET session_type = 'general'
WHERE session_type NOT IN ('general', 'tmwya', 'workout', 'mmb');

COMMENT ON COLUMN public.chat_sessions.session_type IS 'Session type: general (default for Chat with Pat), tmwya (Tell Me What You Ate), workout, mmb (Make Me Better). Legacy values (user_chat, admin_test, onboarding) migrated to general.';
