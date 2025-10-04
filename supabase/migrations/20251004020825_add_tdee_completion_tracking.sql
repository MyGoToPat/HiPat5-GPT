/*
  # Add TDEE Completion Tracking

  1. Changes
    - Add `tdee_completed` boolean column to `user_metrics` table
    - Set default to false
    - Backfill existing records with tdee > 0 to true
  
  2. Purpose
    - Track whether user has completed TDEE calculator
    - Prevent Pat from repeatedly reminding users to complete TDEE
    - Reduce token waste
*/

-- Add tdee_completed column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_metrics' AND column_name = 'tdee_completed'
  ) THEN
    ALTER TABLE user_metrics 
    ADD COLUMN tdee_completed boolean DEFAULT false;
  END IF;
END $$;

-- Backfill: Set tdee_completed = true for users with existing TDEE values
UPDATE user_metrics 
SET tdee_completed = true 
WHERE tdee IS NOT NULL AND tdee > 0 AND tdee_completed = false;