/*
  # Make user_id nullable in meal_items table

  1. Changes
    - Remove NOT NULL constraint from user_id column
    - user_id is redundant since ownership is determined through meal_logs

  2. Notes
    - The relationship meal_items -> meal_logs -> user_id is sufficient for access control
    - RLS policies check ownership through this relationship
    - Making user_id nullable avoids data duplication
*/

-- Make user_id nullable
ALTER TABLE public.meal_items 
  ALTER COLUMN user_id DROP NOT NULL;
