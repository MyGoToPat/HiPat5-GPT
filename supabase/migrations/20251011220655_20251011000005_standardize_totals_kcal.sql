/*
  # Standardize meal_logs.totals to use 'kcal' only
  
  1. Changes
    - Migrate existing 'calories' key to 'kcal' if missing
    - Remove 'calories' key to prevent dual-key drift
    - Ensures single source of truth for calorie values
    
  2. Purpose
    - Prevents data inconsistency between kcal and calories keys
    - Simplifies queries and dashboard logic
    - Aligns with 4/4/9 reconciliation policy
    
  3. Security
    - No RLS changes
*/

-- Update existing rows to have kcal if missing (use calories as fallback)
UPDATE meal_logs
SET totals = jsonb_set(
  totals,
  '{kcal}',
  COALESCE(totals->'kcal', totals->'calories', '0'::jsonb),
  true
)
WHERE totals->'kcal' IS NULL AND totals IS NOT NULL;

-- Remove 'calories' key from all rows
UPDATE meal_logs
SET totals = totals - 'calories'
WHERE totals ? 'calories';

-- Add schema comment
COMMENT ON COLUMN meal_logs.totals IS 
'Macro totals using keys: kcal, protein_g, fat_g, carbs_g. Use kcal only (not calories). Should follow 4/4/9 rule: kcal = 4*protein_g + 4*carbs_g + 9*fat_g';
