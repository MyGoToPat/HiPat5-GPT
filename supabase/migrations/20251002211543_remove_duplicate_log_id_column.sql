/*
  # Remove duplicate log_id column from meal_items

  1. Problem
    - meal_items has BOTH log_id and meal_log_id columns
    - Both are NOT NULL and both reference meal_logs.id
    - Code uses meal_log_id but log_id is also required
    - This causes insert failures

  2. Solution
    - Drop the old log_id column
    - Keep meal_log_id as the standard column name
    - Update RLS policies if needed

  3. Notes
    - meal_log_id is the correct column name used throughout the codebase
    - log_id appears to be a legacy column
*/

-- Drop the old log_id column (will cascade foreign key constraint)
ALTER TABLE public.meal_items 
  DROP COLUMN IF EXISTS log_id CASCADE;
