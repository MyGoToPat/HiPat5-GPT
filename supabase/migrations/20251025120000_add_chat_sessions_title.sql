/*
  # Add title column to chat_sessions

  1. Problem
    - chat_sessions table missing 'title' column
    - Code attempts to INSERT with title causing 400/PGRST204 errors

  2. Changes
    - Add 'title' text column (nullable)
    - Backfill existing NULL rows with default 'General Chat'

  3. Safety
    - Uses IF NOT EXISTS (idempotent)
    - Column is nullable, no breaking changes
    - Does not affect RLS policies
*/

-- Add `title` to chat_sessions if missing. Keep it nullable and simple.
-- This is idempotent. It will not error if the column already exists.
ALTER TABLE public.chat_sessions
ADD COLUMN IF NOT EXISTS title text;

-- Optional: backfill a default title for NULL rows (safe no-op if none):
UPDATE public.chat_sessions
SET title = COALESCE(title, 'General Chat')
WHERE title IS NULL;

-- Quick verification query (read-only):
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'chat_sessions'
--   AND column_name = 'title';
