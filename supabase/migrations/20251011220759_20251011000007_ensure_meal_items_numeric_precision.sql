/*
  # Ensure meal_items uses NUMERIC for full precision
  
  1. Changes
    - Drop trigger that depends on column types
    - Alter meal_items columns to NUMERIC type
    - Recreate trigger with updated column types
    
  2. Purpose
    - Supports unrounded intermediate calculations
    - Prevents rounding errors during aggregation
    - Aligns with rounding policy: store full precision, round only for display
    
  3. Security
    - No RLS changes
*/

-- Drop trigger temporarily
DROP TRIGGER IF EXISTS trg_meal_items_macros ON meal_items;

-- Alter columns to NUMERIC type if not already
DO $$
BEGIN
  -- Check if columns need type change
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items'
    AND column_name = 'energy_kcal'
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE meal_items 
      ALTER COLUMN energy_kcal TYPE NUMERIC USING energy_kcal::NUMERIC;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items'
    AND column_name = 'protein_g'
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE meal_items 
      ALTER COLUMN protein_g TYPE NUMERIC USING protein_g::NUMERIC;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items'
    AND column_name = 'fat_g'
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE meal_items 
      ALTER COLUMN fat_g TYPE NUMERIC USING fat_g::NUMERIC;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items'
    AND column_name = 'carbs_g'
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE meal_items 
      ALTER COLUMN carbs_g TYPE NUMERIC USING carbs_g::NUMERIC;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_items'
    AND column_name = 'fiber_g'
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE meal_items 
      ALTER COLUMN fiber_g TYPE NUMERIC USING fiber_g::NUMERIC;
  END IF;
END $$;

-- Recreate trigger if function exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'meal_items_compute_macros_biur') THEN
    CREATE TRIGGER trg_meal_items_macros 
    BEFORE INSERT OR UPDATE OF energy_kcal, protein_g, carbs_g, fat_g, macros 
    ON meal_items 
    FOR EACH ROW 
    EXECUTE FUNCTION meal_items_compute_macros_biur();
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN meal_items.energy_kcal IS 
'Energy in kilocalories (full precision NUMERIC). Store unrounded values; round only for display. Should equal 4*protein_g + 4*carbs_g + 9*fat_g';

COMMENT ON COLUMN meal_items.protein_g IS 
'Protein in grams (full precision NUMERIC). Store unrounded values; round only for display.';

COMMENT ON COLUMN meal_items.fat_g IS 
'Fat in grams (full precision NUMERIC). Store unrounded values; round only for display.';

COMMENT ON COLUMN meal_items.carbs_g IS 
'Carbohydrates in grams (full precision NUMERIC). Store unrounded values; round only for display.';

COMMENT ON COLUMN meal_items.fiber_g IS 
'Fiber in grams (full precision NUMERIC). Store unrounded values; round only for display. Fiber does not contribute to calorie calculation.';
