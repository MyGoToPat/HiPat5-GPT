/*
  # Drop chat_history_id trigger completely

  1. Cleanup
    - Drop trigger that references chat_history_id
    - Drop function that references chat_history_id
    - This column was removed; trigger causes 42703 errors

  2. Verification
    - Chat messages can be inserted with only: session_id, user_id, sender, text, metadata
    - No more "record 'new' has no field 'chat_history_id'" errors
*/

-- Drop trigger first
DROP TRIGGER IF EXISTS trg_chat_messages_backfill_fk ON public.chat_messages;

-- Drop function completely (CASCADE removes dependencies)
DROP FUNCTION IF EXISTS public.chat_messages_backfill_fk() CASCADE;

-- Verify chat_messages table structure (no chat_history_id column should exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'chat_history_id'
  ) THEN
    RAISE EXCEPTION 'chat_history_id column still exists - manual intervention required';
  END IF;
END $$;

-- Success message
COMMENT ON TABLE public.chat_messages IS 'Chat messages table - chat_history_id removed, trigger dropped successfully';
