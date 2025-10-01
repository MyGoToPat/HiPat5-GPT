/*
  # Add Personal Metrics to user_metrics Table

  1. Changes
    - Add `age` column (integer)
    - Add `gender` column (text)
    - Add `height_cm` column (numeric)
    - Add `weight_kg` column (numeric)
    - Add `body_fat_percent` column (numeric)
    - Add `activity_level` column (text)
    - Add `dietary_preference` column (text)

  2. Purpose
    - Store all TDEE onboarding data in one table
    - Allow users to view and edit all their baseline metrics from profile
    - Enable complete nutrition tracking with full context

  3. Security
    - No RLS changes needed (table already has RLS policies)
*/

-- Add personal metrics columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'age'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN age integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'gender'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN gender text CHECK (gender IN ('male', 'female'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'height_cm'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN height_cm numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'weight_kg'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN weight_kg numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'body_fat_percent'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN body_fat_percent numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'activity_level'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN activity_level text CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'very'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'dietary_preference'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN dietary_preference text CHECK (dietary_preference IN ('carnivore_keto', 'ketovore', 'low_carb', 'balanced_omnivore'));
  END IF;
END $$;
