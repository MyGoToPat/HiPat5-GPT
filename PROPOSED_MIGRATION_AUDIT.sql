/*
  READ-ONLY PROPOSAL: Do not apply without approval

  Generated from repo-wide schema audit (2025-10-07)

  Purpose:
  - Add missing chat_history_id column to chat_messages (if FK is desired)
  - Ensure fiber_g columns exist on all meal/food tables
  - Add safe indexes for performance
  - Align database schema with code expectations

  Findings Summary:
  1. chat_messages uses session_id FK, but chat_history_id column exists unused
  2. meal_items stores fiber inside macros jsonb, not as dedicated column
  3. day_rollups.totals jsonb includes fiber but no dedicated fiber_g column
  4. user_metrics.fiber_target_g already exists (added in 20251007000003)
  5. portion_defaults.fiber_g already exists (added in 20251007000002)

  Recommendation: Review if chat_history_id FK is needed, or remove unused column
*/

-- =====================================================================
-- SECTION 1: Chat Schema Alignment
-- =====================================================================

-- Option A: Add FK if chat_history_id should be used
-- (Currently code uses session_id, so this FK may be redundant)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'chat_messages'
    AND column_name = 'chat_history_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'chat_messages'
    AND ccu.column_name = 'chat_history_id'
    AND tc.constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.chat_messages
      ADD CONSTRAINT fk_chat_messages_history
      FOREIGN KEY (chat_history_id)
      REFERENCES public.chat_histories(id)
      ON DELETE SET NULL;

    COMMENT ON CONSTRAINT fk_chat_messages_history ON public.chat_messages IS
      'Optional FK to chat_histories. Code currently uses session_id instead.';
  END IF;
END $$;

-- Option B: Remove unused chat_history_id column (if decision is to keep session_id only)
-- UNCOMMENT IF APPROVED:
-- ALTER TABLE public.chat_messages DROP COLUMN IF EXISTS chat_history_id;

-- =====================================================================
-- SECTION 2: Fiber Schema Completion
-- =====================================================================

-- meal_items: Add fiber_g column if missing
-- (Current code stores fiber inside macros jsonb, but dedicated column is cleaner)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meal_items'
    AND column_name = 'fiber_g'
  ) THEN
    ALTER TABLE public.meal_items
      ADD COLUMN fiber_g numeric DEFAULT 0;

    COMMENT ON COLUMN public.meal_items.fiber_g IS
      'Fiber in grams. Currently stored in macros.fiber_g jsonb field. Consider migrating.';
  END IF;
END $$;

-- day_rollups: Add fiber_g column if missing
-- (Currently stored inside totals jsonb as totals.fiber_g)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'day_rollups'
    AND column_name = 'fiber_g'
  ) THEN
    ALTER TABLE public.day_rollups
      ADD COLUMN fiber_g numeric DEFAULT 0;

    COMMENT ON COLUMN public.day_rollups.fiber_g IS
      'Daily fiber total. Currently stored in totals.fiber_g jsonb. Consider denormalizing for performance.';
  END IF;
END $$;

-- food_cache: Add fiber_g inside macros jsonb structure
-- (No schema change needed - jsonb is flexible, but document expected structure)
COMMENT ON COLUMN public.food_cache.macros IS
  'Expected structure: { "kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number }';

-- =====================================================================
-- SECTION 3: Performance Indexes
-- =====================================================================

-- Index on meal_items for user queries by date
CREATE INDEX IF NOT EXISTS idx_meal_items_user_created
  ON public.meal_items(user_id, created_at DESC);

-- Index on day_rollups for date range queries
CREATE INDEX IF NOT EXISTS idx_day_rollups_user_date
  ON public.day_rollups(user_id, date DESC);

-- Index on chat_messages for session retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON public.chat_messages(session_id, created_at ASC);

-- Index on food_cache for lookup by name
CREATE INDEX IF NOT EXISTS idx_food_cache_name_lower
  ON public.food_cache(LOWER(name));

-- Index on macro_payloads for unconsumed payload lookup
CREATE INDEX IF NOT EXISTS idx_macro_payloads_user_consumed
  ON public.macro_payloads(user_id, consumed, created_at DESC)
  WHERE consumed = false;

-- =====================================================================
-- SECTION 4: Data Migration Helpers (OPTIONAL)
-- =====================================================================

-- Helper function to migrate fiber from macros jsonb to dedicated column
-- UNCOMMENT AND RUN MANUALLY IF APPROVED:
/*
CREATE OR REPLACE FUNCTION migrate_fiber_to_column()
RETURNS void AS $$
BEGIN
  -- Migrate meal_items
  UPDATE public.meal_items
  SET fiber_g = COALESCE((macros->>'fiber_g')::numeric, 0)
  WHERE fiber_g = 0 AND macros->>'fiber_g' IS NOT NULL;

  -- Migrate day_rollups
  UPDATE public.day_rollups
  SET fiber_g = COALESCE((totals->>'fiber_g')::numeric, 0)
  WHERE fiber_g = 0 AND totals->>'fiber_g' IS NOT NULL;

  RAISE NOTICE 'Fiber migration complete';
END;
$$ LANGUAGE plpgsql;

-- Run migration: SELECT migrate_fiber_to_column();
*/

-- =====================================================================
-- SECTION 5: Validation Queries
-- =====================================================================

-- Query to check if fiber data exists in jsonb vs dedicated columns
-- Run this BEFORE applying migration to assess impact:
/*
SELECT
  'meal_items' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN macros->>'fiber_g' IS NOT NULL THEN 1 END) as fiber_in_jsonb,
  COUNT(CASE WHEN fiber_g > 0 THEN 1 END) as fiber_in_column
FROM public.meal_items
UNION ALL
SELECT
  'day_rollups' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN totals->>'fiber_g' IS NOT NULL THEN 1 END) as fiber_in_jsonb,
  COUNT(CASE WHEN fiber_g > 0 THEN 1 END) as fiber_in_column
FROM public.day_rollups;
*/

-- =====================================================================
-- END OF PROPOSED MIGRATION
-- =====================================================================
