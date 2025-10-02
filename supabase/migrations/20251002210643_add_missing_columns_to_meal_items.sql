/*
  # Add missing columns to meal_items table

  1. Changes
    - Add `position` column (integer) - Order of item within meal
    - Add `cache_id` column (text) - Reference to food_cache
    - Add `name` column (text) - Food name
    - Add `grams` column (float) - Portion in grams
    - Add `micros` column (jsonb) - Micronutrients data

  2. Notes
    - These columns are required by the TMWYA meal logging system
    - Existing columns (display_name, qty_grams, etc.) will remain for backward compatibility
    - New code will use the new column names
*/

-- Add position column (order within meal)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items' AND column_name = 'position'
  ) THEN
    ALTER TABLE public.meal_items ADD COLUMN position int;
    -- Populate existing rows with their idx value
    UPDATE public.meal_items SET position = idx WHERE position IS NULL;
    -- Make it NOT NULL after populating
    ALTER TABLE public.meal_items ALTER COLUMN position SET NOT NULL;
  END IF;
END $$;

-- Add cache_id column (reference to food_cache)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items' AND column_name = 'cache_id'
  ) THEN
    ALTER TABLE public.meal_items ADD COLUMN cache_id text;
  END IF;
END $$;

-- Add name column (food name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.meal_items ADD COLUMN name text;
    -- Populate existing rows with their display_name value
    UPDATE public.meal_items SET name = display_name WHERE name IS NULL;
    -- Make it NOT NULL after populating
    ALTER TABLE public.meal_items ALTER COLUMN name SET NOT NULL;
  END IF;
END $$;

-- Add grams column (portion in grams)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items' AND column_name = 'grams'
  ) THEN
    ALTER TABLE public.meal_items ADD COLUMN grams float;
    -- Populate existing rows with their qty_grams value
    UPDATE public.meal_items SET grams = qty_grams WHERE grams IS NULL;
  END IF;
END $$;

-- Add micros column (micronutrients)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items' AND column_name = 'micros'
  ) THEN
    ALTER TABLE public.meal_items ADD COLUMN micros jsonb;
  END IF;
END $$;

-- Create index on cache_id for faster lookups
CREATE INDEX IF NOT EXISTS meal_items_cache_idx ON public.meal_items(cache_id) WHERE cache_id IS NOT NULL;
