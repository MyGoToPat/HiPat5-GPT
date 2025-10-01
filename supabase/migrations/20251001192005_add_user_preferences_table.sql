/*
  # Add User Preferences Table

  1. New Tables
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, unique, references auth.users)
      - `theme` (text) - dark, light, auto
      - `notifications_email` (boolean) - email notifications enabled
      - `notifications_push` (boolean) - push notifications enabled
      - `notifications_sms` (boolean) - sms notifications enabled
      - `voice_speed` (numeric) - speech speed multiplier (0.5-2.0)
      - `voice_pitch` (numeric) - voice pitch multiplier (0.5-2.0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_preferences` table
    - Add policy for users to read their own preferences
    - Add policy for users to update their own preferences

  3. Purpose
    - Store all user preference settings
    - Allow users to customize their experience
    - Persist settings across sessions and devices
*/

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'auto')),
  notifications_email boolean DEFAULT true,
  notifications_push boolean DEFAULT true,
  notifications_sms boolean DEFAULT false,
  voice_speed numeric DEFAULT 1.0 CHECK (voice_speed >= 0.5 AND voice_speed <= 2.0),
  voice_pitch numeric DEFAULT 1.0 CHECK (voice_pitch >= 0.5 AND voice_pitch <= 2.0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own preferences
CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
