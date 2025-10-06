/*
  # Add metadata column to chat_messages

  CRITICAL FIX: Phase 6 requires metadata column for storing macro payloads

  This was missing, causing all message saves to fail with:
  "Could not find the 'metadata' column of 'chat_messages' in the schema cache"
*/

-- Add metadata column to chat_messages table
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata
ON public.chat_messages USING gin(metadata);

COMMENT ON COLUMN public.chat_messages.metadata IS 'Stores macro payloads and other message metadata as JSONB';
