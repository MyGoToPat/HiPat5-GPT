/*
  # Set Eastern Time (ET) as Default Timezone for All Users

  ## Summary
  This migration standardizes all user timezones to Eastern Time (America/New_York).
  This ensures daylight saving time support and consistent timezone handling across the system.

  ## Changes Made
  1. **Existing Users**: Updates all users in user_preferences to use America/New_York timezone
  2. **New Users**: Sets default value for timezone column to America/New_York
  3. **Null Handling**: Updates any null timezone values to America/New_York

  ## Impact
  - All existing users will have their timezone set to Eastern Time
  - All future user registrations will default to Eastern Time
  - Users can still manually change their timezone via the profile settings if needed

  ## Rollback
  If needed, users can manually update their timezone in the Personal Information section
*/

-- Step 1: Update all existing users to Eastern Time (America/New_York)
-- This handles users who already have a timezone preference set
UPDATE user_preferences
SET
  timezone = 'America/New_York',
  updated_at = now()
WHERE timezone IS NULL OR timezone != 'America/New_York';

-- Step 2: Set default value for timezone column for all future inserts
-- This ensures new users automatically get Eastern Time
ALTER TABLE user_preferences
ALTER COLUMN timezone SET DEFAULT 'America/New_York';

-- Step 3: Create a trigger to ensure timezone is always set on insert if not provided
-- This is a safety measure to guarantee Eastern Time default
CREATE OR REPLACE FUNCTION ensure_timezone_default()
RETURNS TRIGGER AS $$
BEGIN
  -- If timezone is NULL on insert, set it to Eastern Time
  IF NEW.timezone IS NULL THEN
    NEW.timezone := 'America/New_York';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and create fresh
DROP TRIGGER IF EXISTS ensure_timezone_on_insert ON user_preferences;

CREATE TRIGGER ensure_timezone_on_insert
  BEFORE INSERT ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION ensure_timezone_default();

-- Step 4: Verify the migration by selecting count of users with Eastern Time
-- This will show in migration logs
DO $$
DECLARE
  total_users INTEGER;
  et_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM user_preferences;
  SELECT COUNT(*) INTO et_users FROM user_preferences WHERE timezone = 'America/New_York';

  RAISE NOTICE 'Timezone Migration Complete:';
  RAISE NOTICE '  Total users in user_preferences: %', total_users;
  RAISE NOTICE '  Users now set to Eastern Time: %', et_users;
  RAISE NOTICE '  Percentage: %', ROUND((et_users::NUMERIC / NULLIF(total_users, 0) * 100), 2);
END $$;
