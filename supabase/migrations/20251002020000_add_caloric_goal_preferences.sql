/*
  # Add Caloric Goal Preferences

  1. Updates to user_metrics table
    - `caloric_goal` - User's chosen goal: deficit, maintenance, or surplus
    - `caloric_adjustment` - Amount of deficit/surplus in calories

  2. Purpose
    - Persist user's caloric goal selection
    - Remember deficit/surplus amount between sessions
    - Use for dashboard calculations and tracking
*/

-- Add caloric goal columns to user_metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'caloric_goal'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN caloric_goal text DEFAULT 'maintenance';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'caloric_adjustment'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN caloric_adjustment integer DEFAULT 500;
  END IF;
END $$;
