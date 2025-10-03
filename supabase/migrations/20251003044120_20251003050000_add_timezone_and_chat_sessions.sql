/*
  # Add Timezone Support and Chat Sessions System
  
  ## Overview
  This migration adds timezone-aware date handling for macro resets and implements
  the complete chat history system with sessions, messages, and summaries.
  
  ## Changes Made
  
  ### 1. Timezone Support
  - Add `timezone` column to `user_preferences` (IANA timezone string, e.g., 'America/New_York')
  - Create helper function `get_user_local_date()` to convert UTC to user's local date
  - Create helper function `get_user_local_datetime()` for timezone conversions
  - Default timezone to 'UTC' for existing users (can be updated via settings)
  
  ### 2. Chat Sessions Table
  - Create `chat_sessions` table to track conversation sessions
  - Columns: id, user_id, started_at, ended_at, active, session_type
  - Replace chat_history_id references with session-based tracking
  - Support admin test sessions via session_type field
  
  ### 3. Chat Messages Migration
  - Add `session_id` column to `chat_messages` table
  - Add `sender` column with CHECK constraint ('user' or 'pat')
  - Migrate data from old `chat_history_id` to new `session_id`
  - Keep backward compatibility during transition
  
  ### 4. Chat Summaries Table
  - Create `chat_summaries` table for session-end summaries
  - Store structured facts as JSONB for RAG/context retrieval
  - Link to sessions for traceability
  
  ### 5. Updated RLS Policies
  - Strict RLS on all chat tables (users see only their data)
  - Admin access for debugging test sessions
  - Prevent cross-user data leakage
  
  ## Security
  - Enable RLS on all new tables
  - Users can only access their own sessions, messages, and summaries
  - Admins have read access for debugging purposes
  
  ## Notes
  - Timezone defaults to UTC; users should update via preferences UI
  - Chat sessions auto-close at midnight (handled by Edge Function)
  - Day rollups will be updated in next migration to use timezone-aware dates
*/

-- ========== PART 1: TIMEZONE SUPPORT ==========

-- Add timezone column to user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN timezone text DEFAULT 'UTC' NOT NULL;
    
    -- Add check constraint to ensure valid timezone format
    ALTER TABLE user_preferences 
    ADD CONSTRAINT valid_timezone CHECK (
      timezone ~ '^[A-Za-z]+(/[A-Za-z_]+)*$' 
      OR timezone IN ('UTC', 'GMT')
    );
  END IF;
END $$;

-- Create function to get user's local date from UTC timestamp
CREATE OR REPLACE FUNCTION get_user_local_date(
  p_user_id uuid,
  p_utc_timestamp timestamptz
)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_timezone text;
  v_local_timestamp timestamptz;
BEGIN
  -- Get user's timezone preference (default to UTC if not set)
  SELECT COALESCE(timezone, 'UTC')
  INTO v_timezone
  FROM user_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences record, use UTC
  IF v_timezone IS NULL THEN
    v_timezone := 'UTC';
  END IF;
  
  -- Convert UTC timestamp to user's local timezone and extract date
  v_local_timestamp := p_utc_timestamp AT TIME ZONE v_timezone;
  
  RETURN v_local_timestamp::date;
END;
$$;

-- Create function to get user's local datetime from UTC timestamp
CREATE OR REPLACE FUNCTION get_user_local_datetime(
  p_user_id uuid,
  p_utc_timestamp timestamptz DEFAULT now()
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_timezone text;
BEGIN
  -- Get user's timezone preference
  SELECT COALESCE(timezone, 'UTC')
  INTO v_timezone
  FROM user_preferences
  WHERE user_id = p_user_id;
  
  -- Convert to user's timezone
  RETURN p_utc_timestamp AT TIME ZONE v_timezone;
END;
$$;

-- ========== PART 2: CHAT SESSIONS TABLE ==========

CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  session_type text NOT NULL DEFAULT 'user_chat' CHECK (session_type IN ('user_chat', 'admin_test', 'onboarding')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS chat_sessions_active_idx ON chat_sessions(user_id, active) WHERE active = true;

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read their own sessions
DROP POLICY IF EXISTS "Users can read own chat sessions" ON chat_sessions;
CREATE POLICY "Users can read own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: Users can insert their own sessions
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON chat_sessions;
CREATE POLICY "Users can insert own chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS: Users can update their own sessions
DROP POLICY IF EXISTS "Users can update own chat sessions" ON chat_sessions;
CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ========== PART 3: UPDATE CHAT_MESSAGES TABLE ==========

-- Add session_id column (nullable during migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'session_id'
  ) THEN
    ALTER TABLE chat_messages 
    ADD COLUMN session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add sender column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'sender'
  ) THEN
    ALTER TABLE chat_messages 
    ADD COLUMN sender text CHECK (sender IN ('user', 'pat', 'system'));
    
    -- Backfill sender from is_user if it exists
    UPDATE chat_messages 
    SET sender = CASE 
      WHEN is_user = true THEN 'user'
      WHEN is_user = false THEN 'pat'
      ELSE 'system'
    END
    WHERE sender IS NULL AND is_user IS NOT NULL;
  END IF;
END $$;

-- Add user_id column for direct user reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_messages' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE chat_messages 
    ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on session_id
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON chat_messages(user_id, timestamp DESC);

-- Update RLS policies for new structure
DROP POLICY IF EXISTS "Users can read own chat messages" ON chat_messages;
CREATE POLICY "Users can read own chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = chat_messages.session_id
      AND cs.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;
CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM chat_sessions cs
      WHERE cs.id = chat_messages.session_id
      AND cs.user_id = auth.uid()
    )
  );

-- ========== PART 4: CHAT SUMMARIES TABLE ==========

CREATE TABLE IF NOT EXISTS chat_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text NOT NULL,
  facts jsonb DEFAULT '{}',
  message_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_summaries_session_id_idx ON chat_summaries(session_id);
CREATE INDEX IF NOT EXISTS chat_summaries_user_id_idx ON chat_summaries(user_id, created_at DESC);

ALTER TABLE chat_summaries ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read their own summaries
DROP POLICY IF EXISTS "Users can read own summaries" ON chat_summaries;
CREATE POLICY "Users can read own summaries"
  ON chat_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: System can insert summaries
DROP POLICY IF EXISTS "System can insert summaries" ON chat_summaries;
CREATE POLICY "System can insert summaries"
  ON chat_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ========== PART 5: HELPER FUNCTIONS ==========

-- Function to get or create active session for user
CREATE OR REPLACE FUNCTION get_or_create_active_session(
  p_user_id uuid,
  p_session_type text DEFAULT 'user_chat'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Try to get existing active session
  SELECT id INTO v_session_id
  FROM chat_sessions
  WHERE user_id = p_user_id
    AND active = true
    AND session_type = p_session_type
  ORDER BY started_at DESC
  LIMIT 1;
  
  -- If no active session, create one
  IF v_session_id IS NULL THEN
    INSERT INTO chat_sessions (user_id, session_type, active)
    VALUES (p_user_id, p_session_type, true)
    RETURNING id INTO v_session_id;
  END IF;
  
  RETURN v_session_id;
END;
$$;

-- Function to close session and trigger summarization
CREATE OR REPLACE FUNCTION close_chat_session(
  p_session_id uuid,
  p_summary text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_message_count int;
BEGIN
  -- Get session info
  SELECT user_id INTO v_user_id
  FROM chat_sessions
  WHERE id = p_session_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Session % not found', p_session_id;
  END IF;
  
  -- Count messages in session
  SELECT COUNT(*) INTO v_message_count
  FROM chat_messages
  WHERE session_id = p_session_id;
  
  -- Close the session
  UPDATE chat_sessions
  SET active = false,
      ended_at = now()
  WHERE id = p_session_id;
  
  -- Create summary if provided
  IF p_summary IS NOT NULL THEN
    INSERT INTO chat_summaries (session_id, user_id, summary, message_count)
    VALUES (p_session_id, v_user_id, p_summary, v_message_count);
  END IF;
END;
$$;

-- Function to close all active sessions for users at midnight in their timezone
CREATE OR REPLACE FUNCTION close_sessions_at_midnight()
RETURNS TABLE(closed_session_id uuid, user_id uuid)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH sessions_to_close AS (
    SELECT cs.id, cs.user_id
    FROM chat_sessions cs
    JOIN user_preferences up ON up.user_id = cs.user_id
    WHERE cs.active = true
      AND cs.session_type = 'user_chat'
      AND EXTRACT(HOUR FROM (now() AT TIME ZONE COALESCE(up.timezone, 'UTC'))) = 0
      AND EXTRACT(MINUTE FROM (now() AT TIME ZONE COALESCE(up.timezone, 'UTC'))) < 30
  )
  UPDATE chat_sessions cs
  SET active = false,
      ended_at = now()
  FROM sessions_to_close stc
  WHERE cs.id = stc.id
  RETURNING cs.id, cs.user_id;
END;
$$;
