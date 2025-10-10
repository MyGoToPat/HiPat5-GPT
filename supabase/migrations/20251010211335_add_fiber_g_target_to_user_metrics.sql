/*
  # Add Fiber Target to User Metrics

  1. Changes
    - Add `fiber_g_target` column to `user_metrics` table
    - Optional daily fiber goal in grams
    - Defaults to NULL (no target set)
  
  2. Purpose
    - Allow users to set and track daily fiber intake goals
    - USDA recommends 25-35g per day
*/

-- Add fiber target column
ALTER TABLE user_metrics 
ADD COLUMN IF NOT EXISTS fiber_g_target NUMERIC;

-- Add comment
COMMENT ON COLUMN user_metrics.fiber_g_target IS 
'Daily fiber target in grams (optional). USDA recommends 25-35g per day';
