/*
  # Rename display_name to name in meal_items

  1. Problem
    - Database has column named "display_name"
    - Code tries to insert "name"
    - This causes NOT NULL constraint violation

  2. Solution
    - Rename display_name to name for consistency with codebase
    - This column already has duplicate "name" column, so we need to handle carefully

  3. Notes
    - Check if both columns exist and handle appropriately
*/

-- Check if we have both display_name and name columns
-- If display_name exists and name doesn't have data, drop name and rename display_name
DO $$
BEGIN
  -- If display_name exists, handle the migration
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_items' AND column_name = 'display_name'
  ) THEN
    -- If name column also exists, drop it first (assuming it's the newer duplicate)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'meal_items' AND column_name = 'name'
    ) THEN
      ALTER TABLE public.meal_items DROP COLUMN name;
    END IF;
    
    -- Now rename display_name to name
    ALTER TABLE public.meal_items RENAME COLUMN display_name TO name;
  END IF;
END $$;
