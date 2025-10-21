/*
  # 24-Hour Chat Sessions and EST Default Timezone

  ## Overview
  Implements Pat's chat session continuity system:
  - Chat sessions reset at midnight (12:00 AM) based on user's timezone
  - Pat continues the last chat session unless 24 hours have passed
  - All new users default to EST (America/New_York) timezone
  - Sessions align with food logging day boundaries (12:00 AM - 11:59 PM)

  ## Changes
  1. Ensures user_preferences.timezone defaults to 'America/New_York' (EST)
  2. Creates helper function to get current session for user
  3. Creates helper function to check if new session is needed (24hr boundary crossed)
  4. Updates chat_sessions to track session_date (local date in user's timezone)

  ## Architecture
  - Food logging resets at midnight in user's timezone
  - Chat sessions align with the same midnight-to-midnight boundary
  - Pat references the "active session" which is today's session in user's timezone
  - When user starts a conversation, Pat loads messages from active session
  - When midnight passes, a new session is created on next message
*/

-- =============================================================================
-- 1. ENSURE DEFAULT TIMEZONE IS EST
-- =============================================================================

-- Update user_preferences to set default timezone if null
UPDATE user_preferences
SET timezone = 'America/New_York'
WHERE timezone IS NULL;

-- Ensure the default is set for future inserts (already in existing migration)
ALTER TABLE user_preferences
ALTER COLUMN timezone SET DEFAULT 'America/New_York';

-- =============================================================================
-- 2. ADD SESSION_DATE TO CHAT_SESSIONS
-- =============================================================================

-- Add session_date column to track which local date this session represents
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS session_date DATE;

-- Create index for fast lookup of today's session
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_date
ON chat_sessions(user_id, session_date DESC);

-- =============================================================================
-- 3. REPLACE EXISTING GET_OR_CREATE_ACTIVE_SESSION WITH 24HR LOGIC
-- =============================================================================

-- Replace the old get_or_create_active_session to use 24-hour session logic
CREATE OR REPLACE FUNCTION get_or_create_active_session(
  p_user_id UUID,
  p_session_type TEXT DEFAULT 'general'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timezone TEXT;
  v_current_date DATE;
  v_session_id UUID;
BEGIN
  -- Get user's timezone from preferences (default EST)
  SELECT COALESCE(timezone, 'America/New_York')
  INTO v_timezone
  FROM user_preferences
  WHERE user_id = p_user_id;

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

GRANT EXECUTE ON FUNCTION get_or_create_active_session(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION get_or_create_active_session IS
'Returns the active chat session for a user. Creates a new session if needed (midnight boundary crossed). Sessions align with food logging day boundaries (12:00 AM - 11:59 PM in user timezone). This REPLACES the old function to use 24-hour session logic.';

-- Also create alias function for backwards compatibility
CREATE OR REPLACE FUNCTION get_active_chat_session(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timezone TEXT;
  v_current_date DATE;
  v_session_id UUID;
BEGIN
  -- Get user's timezone from preferences (default EST)
  SELECT COALESCE(timezone, 'America/New_York')
  INTO v_timezone
  FROM user_preferences
  WHERE user_id = p_user_id;

  -- Get current date in user's timezone
  v_current_date := (NOW() AT TIME ZONE v_timezone)::DATE;

  -- Try to find existing session for today
  SELECT id
  INTO v_session_id
  FROM chat_sessions
  WHERE user_id = p_user_id
    AND session_date = v_current_date
    AND session_type = 'general'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no session for today, create one
  IF v_session_id IS NULL THEN
    INSERT INTO chat_sessions (
      user_id,
      session_type,
      session_date,
      created_at
    )
    VALUES (
      p_user_id,
      'general',
      v_current_date,
      NOW()
    )
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_chat_session(UUID) TO authenticated;

COMMENT ON FUNCTION get_active_chat_session IS
'Returns the active chat session for a user. Creates a new session if needed (midnight boundary crossed). Sessions align with food logging day boundaries (12:00 AM - 11:59 PM in user timezone).';

-- =============================================================================
-- 4. BACKFILL SESSION_DATE FOR EXISTING SESSIONS
-- =============================================================================

-- For existing sessions without session_date, set it based on created_at in EST
UPDATE chat_sessions
SET session_date = (created_at AT TIME ZONE 'America/New_York')::DATE
WHERE session_date IS NULL;

-- =============================================================================
-- 5. HELPER FUNCTION: CHECK IF NEW SESSION NEEDED
-- =============================================================================

CREATE OR REPLACE FUNCTION should_create_new_chat_session(
  p_user_id UUID,
  p_last_session_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_timezone TEXT;
  v_current_date DATE;
  v_last_session_date DATE;
BEGIN
  -- Get user's timezone
  SELECT COALESCE(timezone, 'America/New_York')
  INTO v_timezone
  FROM user_preferences
  WHERE user_id = p_user_id;

  -- Get current date in user's timezone
  v_current_date := (NOW() AT TIME ZONE v_timezone)::DATE;

  -- Get the date of the last session
  SELECT session_date
  INTO v_last_session_date
  FROM chat_sessions
  WHERE id = p_last_session_id;

  -- If last session is NULL or from a different date, create new session
  IF v_last_session_date IS NULL OR v_last_session_date < v_current_date THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION should_create_new_chat_session(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION should_create_new_chat_session IS
'Checks if a new chat session should be created. Returns true if the last session is from a previous date (midnight boundary crossed in user timezone).';

-- =============================================================================
-- 6. TRIGGER: AUTO-SET SESSION_DATE ON INSERT
-- =============================================================================

CREATE OR REPLACE FUNCTION set_chat_session_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_timezone TEXT;
BEGIN
  -- Get user's timezone
  SELECT COALESCE(timezone, 'America/New_York')
  INTO v_timezone
  FROM user_preferences
  WHERE user_id = NEW.user_id;

  -- Set session_date to current date in user's timezone
  NEW.session_date := (NOW() AT TIME ZONE v_timezone)::DATE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_chat_session_date ON chat_sessions;

CREATE TRIGGER trigger_set_chat_session_date
BEFORE INSERT ON chat_sessions
FOR EACH ROW
WHEN (NEW.session_date IS NULL)
EXECUTE FUNCTION set_chat_session_date();

-- =============================================================================
-- 7. VIEW: USER'S CURRENT SESSION INFO
-- =============================================================================

CREATE OR REPLACE VIEW user_current_session_info AS
SELECT
  u.id AS user_id,
  up.timezone,
  (NOW() AT TIME ZONE COALESCE(up.timezone, 'America/New_York'))::DATE AS current_date_local,
  (NOW() AT TIME ZONE COALESCE(up.timezone, 'America/New_York'))::TIME AS current_time_local,
  cs.id AS active_session_id,
  cs.session_date AS active_session_date,
  cs.created_at AS session_started_at,
  (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.id) AS message_count_today
FROM auth.users u
LEFT JOIN user_preferences up ON u.id = up.user_id
LEFT JOIN LATERAL (
  SELECT *
  FROM chat_sessions
  WHERE user_id = u.id
    AND session_date = (NOW() AT TIME ZONE COALESCE(up.timezone, 'America/New_York'))::DATE
    AND session_type = 'general'
  ORDER BY created_at DESC
  LIMIT 1
) cs ON true;

GRANT SELECT ON user_current_session_info TO authenticated;

COMMENT ON VIEW user_current_session_info IS
'Shows each user''s current active chat session, timezone, and local date/time. Used by Pat to determine which session to continue.';

-- =============================================================================
-- NOTES
-- =============================================================================

/*
HOW IT WORKS:

1. User opens chat at 11:45 PM EST on Monday
   - get_active_chat_session() returns Monday's session
   - Pat loads messages from Monday's session
   - User chats with Pat

2. Clock strikes midnight (12:00 AM EST Tuesday)
   - User is still in chat window
   - Next message user sends triggers get_active_chat_session()
   - Function sees it's now Tuesday in user's timezone
   - Creates new Tuesday session
   - Pat starts fresh conversation (references Monday's data but new session)

3. User travels to California (PST, 3 hours behind EST)
   - User updates timezone preference to 'America/Los_Angeles'
   - When it's 9:00 PM PST Monday (12:00 AM EST Tuesday)
   - Pat still treats it as Monday for this user
   - Session won't reset until 12:00 AM PST

4. Pat's Continuity Behavior:
   - Within same day: "Continuing our conversation..."
   - New day: "Good morning! Looking at yesterday's data..." (references prior session)
   - References previous session data even after reset
   - Uses chat_history table to recall multi-day context
*/
