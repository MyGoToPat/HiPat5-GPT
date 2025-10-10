/*
  # Ensure User Preferences Created with Eastern Time on Signup

  ## Summary
  Extends the automatic user creation process to also create user_preferences
  with Eastern Time (America/New_York) as the default timezone.

  ## Changes Made
  1. Updates `handle_new_user()` function to also create user_preferences row
  2. Sets timezone to America/New_York for all new users automatically
  3. Backfills user_preferences for existing users who don't have them

  ## Impact
  - All new user signups will automatically have timezone set to Eastern Time
  - Existing users without user_preferences will get Eastern Time default
  - Ensures consistent timezone handling from user creation

  ## Data Safety
  - Uses ON CONFLICT DO NOTHING to avoid overwriting existing preferences
  - Only adds records, never modifies existing data
*/

-- Update the handle_new_user function to also create user_preferences
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  -- Extract a default name from email (part before @)
  v_name := COALESCE(
    split_part(NEW.email, '@', 1),
    'User'
  );

  -- Create profile for new user
  INSERT INTO public.profiles (
    user_id,
    email,
    name,
    role,
    beta_user
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    'free_user',
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create user_preferences with Eastern Time default
  INSERT INTO public.user_preferences (
    user_id,
    timezone,
    weight_unit,
    height_unit,
    theme,
    notifications_email,
    notifications_push,
    notifications_sms
  )
  VALUES (
    NEW.id,
    'America/New_York',  -- Eastern Time as default
    'lbs',               -- US standard
    'feet',              -- US standard
    'dark',              -- Default theme
    true,                -- Default notification settings
    true,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill user_preferences for existing users who don't have them
-- This ensures ALL users have Eastern Time set
INSERT INTO public.user_preferences (
  user_id,
  timezone,
  weight_unit,
  height_unit,
  theme,
  notifications_email,
  notifications_push,
  notifications_sms
)
SELECT
  au.id,
  'America/New_York',  -- Eastern Time for all
  'lbs',
  'feet',
  'dark',
  true,
  true,
  false
FROM auth.users au
LEFT JOIN public.user_preferences up ON up.user_id = au.id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Verify the changes
DO $$
DECLARE
  total_auth_users INTEGER;
  users_with_prefs INTEGER;
  users_with_et INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_auth_users FROM auth.users;
  SELECT COUNT(*) INTO users_with_prefs FROM user_preferences;
  SELECT COUNT(*) INTO users_with_et
    FROM user_preferences
    WHERE timezone = 'America/New_York';

  RAISE NOTICE 'User Preferences with Eastern Time Setup:';
  RAISE NOTICE '  Total authenticated users: %', total_auth_users;
  RAISE NOTICE '  Users with preferences: %', users_with_prefs;
  RAISE NOTICE '  Users with Eastern Time: %', users_with_et;
  RAISE NOTICE '  Coverage: %', ROUND((users_with_et::NUMERIC / NULLIF(total_auth_users, 0) * 100), 2);
END $$;
