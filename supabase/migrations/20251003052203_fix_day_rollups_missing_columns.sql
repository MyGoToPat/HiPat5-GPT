/*
  # Fix day_rollups table - Add missing columns

  1. Changes
    - Add `meal_count` column to track number of meals logged per day
    - Add `completion` column to track macro completion percentages

  2. Notes
    - The update_day_rollup() trigger function references these columns
    - This migration adds them to fix the "column does not exist" error
*/

-- Add meal_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'day_rollups' AND column_name = 'meal_count'
  ) THEN
    ALTER TABLE public.day_rollups ADD COLUMN meal_count integer DEFAULT 0;
  END IF;
END $$;

-- Add completion column if it doesn't exist  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'day_rollups' AND column_name = 'completion'
  ) THEN
    ALTER TABLE public.day_rollups ADD COLUMN completion jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
