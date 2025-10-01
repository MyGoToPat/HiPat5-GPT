/*
  # Add UI Preference Columns to user_preferences Table

  1. Changes
    - Add `theme` column (text) - dark, light, auto
    - Add `notifications_email` column (boolean)
    - Add `notifications_push` column (boolean)
    - Add `notifications_sms` column (boolean)
    - Add `voice_speed` column (numeric) - 0.5 to 2.0
    - Add `voice_pitch` column (numeric) - 0.5 to 2.0

  2. Purpose
    - Store UI and notification preferences alongside AI persona settings
    - Keep all user preferences in one table
    - Allow users to customize their experience

  3. Notes
    - Table already exists with AI settings (model, temperature, persona)
    - Adding UI settings to same table for consistency
*/

-- Add UI preference columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'theme'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN theme text DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'auto'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'notifications_email'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN notifications_email boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'notifications_push'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN notifications_push boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'notifications_sms'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN notifications_sms boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'voice_speed'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN voice_speed numeric DEFAULT 1.0 CHECK (voice_speed >= 0.5 AND voice_speed <= 2.0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'voice_pitch'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN voice_pitch numeric DEFAULT 1.0 CHECK (voice_pitch >= 0.5 AND voice_pitch <= 2.0);
  END IF;
END $$;
