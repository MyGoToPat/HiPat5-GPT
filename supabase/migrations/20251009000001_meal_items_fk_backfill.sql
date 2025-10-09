/*
  # Backfill session_id, fix meal_items FK, remove legacy meal_log_id

  1. Create backfill sessions
    - Create "Nutrition Backfill" session for each user with meals but no sessions
    - Mark with session_type = 'general' and metadata flag

  2. Backfill meals.session_id
    - For meals with existing overlapping sessions: match by timestamp
    - For meals without sessions: assign to user's Backfill session
    - Ensure all meals.session_id is populated before NOT NULL constraint

  3. Add missing parent meals for orphaned meal_items
    - Find meal_items where meal_log_id doesn't match any meals.id
    - Insert missing parent meals with appropriate session_id
    - Use user's latest session or Backfill session

  4. Fix meal_items FK
    - Add meal_id column
    - Backfill meal_id from meal_log_id
    - Add FK constraint meal_id → meals(id) ON DELETE CASCADE
    - Drop legacy meal_log_id column

  5. Enforce constraints
    - Make meals.session_id NOT NULL
    - Add validation to prevent future orphans

  6. Notes
    - This migration is data-safe: creates parents before enforcing FK
    - All meals will have valid session_id before NOT NULL constraint
    - Orphan validation query provided at end
*/

-- ========== PART 1: CREATE BACKFILL SESSIONS ==========

-- Create "Nutrition Backfill" session for users with meals but no sessions
DO $$
DECLARE
  v_user_record RECORD;
  v_session_id uuid;
BEGIN
  FOR v_user_record IN
    SELECT DISTINCT m.user_id, MIN(m.eaten_at) as first_meal_time
    FROM public.meals m
    LEFT JOIN public.chat_sessions cs ON cs.user_id = m.user_id
    WHERE cs.id IS NULL
    GROUP BY m.user_id
  LOOP
    -- Create a backfill session for this user
    INSERT INTO public.chat_sessions (
      user_id,
      started_at,
      ended_at,
      active,
      session_type,
      metadata,
      created_at
    )
    VALUES (
      v_user_record.user_id,
      v_user_record.first_meal_time,
      NULL,
      false, -- Not active, historical import
      'general',
      jsonb_build_object(
        'backfill', true,
        'source', 'nutrition_data_migration',
        'migration_date', now()
      ),
      now()
    )
    RETURNING id INTO v_session_id;

    RAISE NOTICE 'Created backfill session % for user %', v_session_id, v_user_record.user_id;
  END LOOP;
END $$;

-- ========== PART 2: BACKFILL MEALS.SESSION_ID ==========

-- Function to find best matching session for a meal
CREATE OR REPLACE FUNCTION find_session_for_meal(
  p_user_id uuid,
  p_eaten_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Try to find session that overlaps with meal timestamp
  SELECT id INTO v_session_id
  FROM public.chat_sessions
  WHERE user_id = p_user_id
    AND started_at <= p_eaten_at
    AND (
      ended_at IS NULL
      OR ended_at >= p_eaten_at
      OR (ended_at < p_eaten_at AND p_eaten_at - ended_at < interval '24 hours')
    )
  ORDER BY
    CASE
      WHEN ended_at IS NULL THEN 1
      WHEN ended_at >= p_eaten_at THEN 2
      ELSE 3
    END,
    started_at DESC
  LIMIT 1;

  -- If no overlapping session, use most recent session for user
  IF v_session_id IS NULL THEN
    SELECT id INTO v_session_id
    FROM public.chat_sessions
    WHERE user_id = p_user_id
    ORDER BY started_at DESC
    LIMIT 1;
  END IF;

  RETURN v_session_id;
END;
$$;

-- Backfill session_id for all meals
UPDATE public.meals m
SET session_id = find_session_for_meal(m.user_id, m.eaten_at)
WHERE session_id IS NULL;

-- Drop the helper function
DROP FUNCTION IF EXISTS find_session_for_meal(uuid, timestamptz);

-- Verify all meals now have session_id
DO $$
DECLARE
  v_orphan_count int;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.meals
  WHERE session_id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'Found % meals without session_id after backfill. Cannot proceed.', v_orphan_count;
  END IF;

  RAISE NOTICE 'All meals have valid session_id';
END $$;

-- ========== PART 3: ADD MISSING PARENT MEALS FOR ORPHANED MEAL_ITEMS ==========

-- Add meal_id column to meal_items (nullable for now)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meal_items'
    AND column_name = 'meal_id'
  ) THEN
    ALTER TABLE public.meal_items
      ADD COLUMN meal_id uuid;
  END IF;
END $$;

-- Find orphaned meal_items and create parent meals
DO $$
DECLARE
  v_orphan_record RECORD;
  v_new_meal_id uuid;
  v_session_id uuid;
  v_user_id uuid;
BEGIN
  FOR v_orphan_record IN
    SELECT DISTINCT
      mi.meal_log_id,
      mi.user_id,
      MIN(mi.created_at) as first_item_time
    FROM public.meal_items mi
    LEFT JOIN public.meals m ON m.id = mi.meal_log_id
    WHERE mi.meal_log_id IS NOT NULL
      AND m.id IS NULL
    GROUP BY mi.meal_log_id, mi.user_id
  LOOP
    v_user_id := v_orphan_record.user_id;

    -- Find appropriate session for this user
    SELECT id INTO v_session_id
    FROM public.chat_sessions
    WHERE user_id = v_user_id
    ORDER BY
      CASE
        WHEN metadata->>'backfill' = 'true' THEN 2
        ELSE 1
      END,
      started_at DESC
    LIMIT 1;

    -- If still no session (shouldn't happen after Part 1), create one
    IF v_session_id IS NULL THEN
      INSERT INTO public.chat_sessions (
        user_id,
        started_at,
        active,
        session_type,
        metadata
      )
      VALUES (
        v_user_id,
        v_orphan_record.first_item_time,
        false,
        'general',
        jsonb_build_object('backfill', true, 'source', 'orphan_meal_items')
      )
      RETURNING id INTO v_session_id;
    END IF;

    -- Create the missing parent meal
    INSERT INTO public.meals (
      id, -- Use the orphan meal_log_id as the new meal id
      user_id,
      session_id,
      name,
      eaten_at,
      meal_slot,
      source,
      totals,
      micros_totals,
      energy_kcal,
      protein_g,
      carbs_g,
      fat_g,
      fiber_g,
      created_at
    )
    VALUES (
      v_orphan_record.meal_log_id, -- Reuse the ID
      v_user_id,
      v_session_id,
      'Imported meal',
      v_orphan_record.first_item_time,
      'unknown',
      'text',
      jsonb_build_object('kcal', 0, 'protein_g', 0, 'carbs_g', 0, 'fat_g', 0), -- Triggers will update
      jsonb_build_object('fiber_g', 0),
      0,
      0,
      0,
      0,
      0,
      v_orphan_record.first_item_time
    )
    ON CONFLICT (id) DO NOTHING; -- Skip if already exists

    RAISE NOTICE 'Created parent meal % for orphaned items (user %, session %)',
      v_orphan_record.meal_log_id, v_user_id, v_session_id;
  END LOOP;
END $$;

-- ========== PART 4: BACKFILL MEAL_ID FROM MEAL_LOG_ID ==========

-- Copy meal_log_id to meal_id
UPDATE public.meal_items
SET meal_id = meal_log_id
WHERE meal_id IS NULL AND meal_log_id IS NOT NULL;

-- Verify all meal_items now have meal_id
DO $$
DECLARE
  v_null_count int;
BEGIN
  SELECT COUNT(*) INTO v_null_count
  FROM public.meal_items
  WHERE meal_id IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Found % meal_items with NULL meal_id after backfill', v_null_count;
  END IF;

  RAISE NOTICE 'All meal_items have meal_id populated';
END $$;

-- ========== PART 5: ADD FK CONSTRAINT AND CLEAN UP ==========

-- Make meal_id NOT NULL
ALTER TABLE public.meal_items
  ALTER COLUMN meal_id SET NOT NULL;

-- Add FK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'meal_items_meal_id_fkey'
    AND table_name = 'meal_items'
  ) THEN
    ALTER TABLE public.meal_items
      ADD CONSTRAINT meal_items_meal_id_fkey
      FOREIGN KEY (meal_id)
      REFERENCES public.meals(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Drop old meal_log_id column
ALTER TABLE public.meal_items
  DROP COLUMN IF EXISTS meal_log_id CASCADE;

-- Update index on meal_items
DROP INDEX IF EXISTS public.meal_items_meal_log_idx;
CREATE INDEX IF NOT EXISTS meal_items_meal_id_idx
  ON public.meal_items(meal_id);

-- ========== PART 6: ENFORCE MEALS.SESSION_ID NOT NULL ==========

-- Make session_id NOT NULL on meals
ALTER TABLE public.meals
  ALTER COLUMN session_id SET NOT NULL;

-- Ensure FK constraint exists on session_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'meals_session_id_fkey'
    AND table_name = 'meals'
  ) THEN
    ALTER TABLE public.meals
      ADD CONSTRAINT meals_session_id_fkey
      FOREIGN KEY (session_id)
      REFERENCES public.chat_sessions(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ========== PART 7: UPDATE MEAL_ITEMS RLS POLICIES ==========

-- Update meal_items policies to use meal_id FK
DROP POLICY IF EXISTS "Users can manage own meal items" ON public.meal_items;
CREATE POLICY "Users can manage own meal items"
  ON public.meal_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meals m
      WHERE m.id = meal_items.meal_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meals m
      WHERE m.id = meal_items.meal_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trainers can read client meal items" ON public.meal_items;
CREATE POLICY "Trainers can read client meal items"
  ON public.meal_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meals m
      JOIN public.profiles p ON p.user_id = m.user_id
      JOIN public.org_members om ON om.org_id = p.active_org_id
      WHERE m.id = meal_items.meal_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- ========== PART 8: UPDATE TRIGGERS FOR MEAL_ITEMS ==========

-- Update fn_update_day_rollups to use meal_id FK
CREATE OR REPLACE FUNCTION public.fn_update_day_rollups()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_user uuid;
  v_day date;
BEGIN
  -- Get user_id and day from parent meal
  SELECT m.user_id, (m.eaten_at AT TIME ZONE 'UTC')::date
  INTO v_user, v_day
  FROM public.meals m
  WHERE m.id = NEW.meal_id;

  -- Update day rollup with new item's macros
  INSERT INTO public.day_rollups (user_id, day, kcal, protein_g, carbs_g, fat_g, fiber_g)
  VALUES (
    v_user,
    v_day,
    COALESCE(NEW.kcal, 0),
    COALESCE(NEW.protein_g, 0),
    COALESCE(NEW.carbs_g, 0),
    COALESCE(NEW.fat_g, 0),
    COALESCE(NEW.fiber_g, 0)
  )
  ON CONFLICT (user_id, day) DO UPDATE SET
    kcal = day_rollups.kcal + COALESCE(NEW.kcal, 0),
    protein_g = day_rollups.protein_g + COALESCE(NEW.protein_g, 0),
    carbs_g = day_rollups.carbs_g + COALESCE(NEW.carbs_g, 0),
    fat_g = day_rollups.fat_g + COALESCE(NEW.fat_g, 0),
    fiber_g = day_rollups.fiber_g + COALESCE(NEW.fiber_g, 0);

  RETURN NEW;
END;
$$;

-- Recreate trigger (in case it was dropped)
DROP TRIGGER IF EXISTS trg_meal_items_rollup ON public.meal_items;
CREATE TRIGGER trg_meal_items_rollup
  AFTER INSERT ON public.meal_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_day_rollups();

-- ========== PART 9: VALIDATION QUERY ==========

-- Final validation: ensure zero orphans
DO $$
DECLARE
  v_orphan_count int;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.meal_items mi
  LEFT JOIN public.meals m ON m.id = mi.meal_id
  WHERE mi.meal_id IS NULL OR m.id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Found % orphaned meal_items after migration', v_orphan_count;
  END IF;

  RAISE NOTICE '✓ VALIDATION PASSED: Zero orphaned meal_items';
END $$;

-- Validation: ensure all meals have session_id
DO $$
DECLARE
  v_missing_session_count int;
BEGIN
  SELECT COUNT(*) INTO v_missing_session_count
  FROM public.meals
  WHERE session_id IS NULL;

  IF v_missing_session_count > 0 THEN
    RAISE EXCEPTION 'VALIDATION FAILED: Found % meals without session_id', v_missing_session_count;
  END IF;

  RAISE NOTICE '✓ VALIDATION PASSED: All meals have valid session_id';
END $$;

-- ========== COMMENTS FOR DOCUMENTATION ==========

COMMENT ON COLUMN public.meal_items.meal_id IS 'FK to meals table (parent). Renamed from meal_log_id in migration 20251009000001.';
COMMENT ON CONSTRAINT meal_items_meal_id_fkey ON public.meal_items IS 'Ensures meal_items always reference valid meals. ON DELETE CASCADE cleans up items when parent meal is deleted.';
COMMENT ON CONSTRAINT meals_session_id_fkey ON public.meals IS 'Ensures meals always belong to a chat_session. NOT NULL enforced after backfill. ON DELETE CASCADE cleans up meals when session is deleted.';
