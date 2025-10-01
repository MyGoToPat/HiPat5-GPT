/*
  # Add Unit Preference Columns to user_preferences Table

  1. Changes
    - Add `unit_system` column (text) - 'imperial' or 'metric'
    - Add `height_unit` column (text) - 'feet' or 'cm'
    - Add `weight_unit` column (text) - 'lbs' or 'kg'
    - Add `temperature_unit` column (text) - 'fahrenheit' or 'celsius'

  2. Purpose
    - Store user's preferred unit system for displaying measurements
    - Allow users who chose imperial units during onboarding to see consistent units throughout app
    - Default to imperial (lbs/feet) as that's the primary user base

  3. Notes
    - Defaults to imperial system (lbs, feet, fahrenheit)
    - Can be overridden per-metric if user wants mixed units
*/

-- Add unit preference columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'unit_system'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN unit_system text DEFAULT 'imperial' CHECK (unit_system IN ('imperial', 'metric'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'height_unit'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN height_unit text DEFAULT 'feet' CHECK (height_unit IN ('feet', 'cm'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'weight_unit'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN weight_unit text DEFAULT 'lbs' CHECK (weight_unit IN ('lbs', 'kg'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'temperature_unit'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN temperature_unit text DEFAULT 'fahrenheit' CHECK (temperature_unit IN ('fahrenheit', 'celsius'));
  END IF;
END $$;
