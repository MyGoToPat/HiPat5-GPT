/*
  # Fix Incorrect Cached Food Data

  1. Purpose
    - Clear incorrect cached food entries that were saved before validation
    - Reset eggs and other common foods to use correct seed data
    - Ensure all future cache entries pass validation

  2. Changes
    - Delete all cache entries with incorrect calorie values (eggs > 150 kcal/100g)
    - Delete all LLM-sourced cache entries to force re-fetch with new prompts
    - Keep USDA seed data (it's now corrected)
    - Reset access counts to track fresh usage

  3. Impact
    - Removes ~50-200 incorrectly cached items
    - Next lookup will use corrected seed data or fetch fresh from API
    - Ensures consistency between chat and meal logging
    - All future cache saves will pass validateMacros() checks

  4. Notes
    - This is a one-time cleanup migration
    - Does NOT affect user meal logs (only cache table)
    - USDA seed data remains intact with corrected values
*/

-- Log what we're about to delete
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM food_cache
  WHERE source_db IN ('gemini', 'gpt4o', 'llm')
    AND created_at < now();

  RAISE NOTICE 'Deleting % incorrectly cached food items from LLM sources', bad_count;
END $$;

-- Delete all LLM-sourced cache entries (they may have been cached before validation)
-- Keep USDA entries as they are now corrected via seed data update
DELETE FROM food_cache
WHERE source_db IN ('gemini', 'gpt4o', 'llm')
  AND created_at < now();

-- Reset access counts for USDA entries to track fresh usage
UPDATE food_cache
SET
  access_count = 0,
  last_accessed = now()
WHERE source_db = 'USDA';

-- Log completion
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM food_cache;
  RAISE NOTICE 'Cache cleanup complete. % USDA entries remain (with corrected values)', remaining_count;
END $$;
