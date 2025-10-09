/*
  # Canonicalize meals as parent table with session_id FK

  1. Rename meal_logs to meals (canonical parent table)
    - Rename public.meal_logs → public.meals
    - Preserve all existing columns and data

  2. Add session_id column (nullable initially for backfill)
    - Add session_id uuid column
    - Will be made NOT NULL after backfill in next migration
    - FK to chat_sessions will be added after backfill

  3. Add fiber tracking columns
    - fiber_g numeric DEFAULT 0 for explicit fiber tracking
    - Update totals jsonb to include fiber when present

  4. Update indexes and constraints
    - Rename indexes to use 'meals' prefix
    - Add index on session_id for FK performance
    - Preserve all RLS policies

  5. Update triggers
    - Update trigger functions to reference 'meals' table
    - Preserve macro computation logic

  6. Notes
    - This migration preserves all data
    - Session_id will be backfilled in 20251009000001
    - RLS policies will be updated to use 'meals' table name
*/

-- ========== PART 1: RENAME TABLE ==========

-- Rename meal_logs to meals
ALTER TABLE IF EXISTS public.meal_logs RENAME TO meals;

-- ========== PART 2: ADD SESSION_ID COLUMN ==========

-- Add session_id column (nullable for now, will be filled by backfill migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'session_id'
  ) THEN
    ALTER TABLE public.meals
      ADD COLUMN session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ========== PART 3: ADD FIBER COLUMN ==========

-- Add fiber_g column for explicit fiber tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'fiber_g'
  ) THEN
    ALTER TABLE public.meals
      ADD COLUMN fiber_g numeric DEFAULT 0;
  END IF;
END $$;

-- Backfill fiber_g from micros_totals jsonb
UPDATE public.meals
SET fiber_g = COALESCE((micros_totals->>'fiber_g')::numeric, 0)
WHERE fiber_g IS NULL OR fiber_g = 0;

-- ========== PART 4: ADD STANDARD MACRO COLUMNS ==========

-- Ensure standard macro columns exist (in case not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'energy_kcal'
  ) THEN
    ALTER TABLE public.meals
      ADD COLUMN energy_kcal numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'protein_g'
  ) THEN
    ALTER TABLE public.meals
      ADD COLUMN protein_g numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'carbs_g'
  ) THEN
    ALTER TABLE public.meals
      ADD COLUMN carbs_g numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'fat_g'
  ) THEN
    ALTER TABLE public.meals
      ADD COLUMN fat_g numeric DEFAULT 0;
  END IF;
END $$;

-- Backfill macro columns from totals jsonb if they're zero
UPDATE public.meals
SET
  energy_kcal = COALESCE((totals->>'kcal')::numeric, 0),
  protein_g = COALESCE((totals->>'protein_g')::numeric, 0),
  carbs_g = COALESCE((totals->>'carbs_g')::numeric, 0),
  fat_g = COALESCE((totals->>'fat_g')::numeric, 0)
WHERE energy_kcal = 0 OR protein_g = 0;

-- Add meta jsonb column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'meta'
  ) THEN
    ALTER TABLE public.meals
      ADD COLUMN meta jsonb DEFAULT '{}';
  END IF;
END $$;

-- Rename 'ts' to 'eaten_at' for clarity (if ts exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'ts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'eaten_at'
  ) THEN
    ALTER TABLE public.meals
      RENAME COLUMN ts TO eaten_at;
  END IF;
END $$;

-- Ensure eaten_at has default
ALTER TABLE public.meals
  ALTER COLUMN eaten_at SET DEFAULT now();

-- Rename meal_slot to name for consistency (optional, keep both for compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'meals'
    AND column_name = 'name'
  ) THEN
    -- Add name column, populate from meal_slot
    ALTER TABLE public.meals
      ADD COLUMN name text;

    UPDATE public.meals
    SET name = COALESCE(meal_slot, 'unknown')
    WHERE name IS NULL;

    ALTER TABLE public.meals
      ALTER COLUMN name SET NOT NULL;
  END IF;
END $$;

-- ========== PART 5: UPDATE INDEXES ==========

-- Drop old indexes (if they exist with old names)
DROP INDEX IF EXISTS public.meal_logs_user_date_idx;
DROP INDEX IF EXISTS public.meal_logs_user_created_idx;

-- Create new indexes with 'meals' prefix
CREATE INDEX IF NOT EXISTS meals_user_eaten_at_idx
  ON public.meals(user_id, eaten_at DESC);

CREATE INDEX IF NOT EXISTS meals_session_id_idx
  ON public.meals(session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS meals_user_created_idx
  ON public.meals(user_id, created_at DESC);

-- ========== PART 6: UPDATE RLS POLICIES ==========

-- Drop old policies on meal_logs (if they still reference old table name)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage own meal logs" ON public.meals;
  DROP POLICY IF EXISTS "Trainers can read client meal logs" ON public.meals;
END $$;

-- Create new policies with updated names
CREATE POLICY "Users can manage own meals"
  ON public.meals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trainers can read client meals"
  ON public.meals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      JOIN public.profiles p ON p.user_id = meals.user_id
      WHERE om.user_id = auth.uid()
        AND om.org_id = p.active_org_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- ========== PART 7: UPDATE TRIGGERS ==========

-- Update day_rollup trigger function to reference 'meals' table
CREATE OR REPLACE FUNCTION public.update_day_rollup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_totals jsonb;
  v_targets jsonb;
  v_meal_count int;
  v_last_meal_time timestamptz;
BEGIN
  -- Determine date and user_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_date := DATE(OLD.eaten_at);

    -- Recalculate totals for the day
    SELECT
      COALESCE(jsonb_build_object(
        'kcal', SUM((totals->>'kcal')::float),
        'protein_g', SUM((totals->>'protein_g')::float),
        'carbs_g', SUM((totals->>'carbs_g')::float),
        'fat_g', SUM((totals->>'fat_g')::float),
        'fiber_g', SUM(COALESCE(fiber_g, 0)),
        'tef_kcal', SUM((totals->>'tef_kcal')::float)
      ), jsonb_build_object('kcal', 0, 'protein_g', 0, 'carbs_g', 0, 'fat_g', 0, 'fiber_g', 0, 'tef_kcal', 0)),
      COUNT(*),
      MAX(eaten_at)
    INTO v_totals, v_meal_count, v_last_meal_time
    FROM public.meals
    WHERE user_id = OLD.user_id AND DATE(eaten_at) = v_date;

    -- Update or delete rollup
    IF v_meal_count = 0 THEN
      DELETE FROM public.day_rollups WHERE user_id = OLD.user_id AND date = v_date;
    ELSE
      -- Get targets
      SELECT jsonb_build_object(
        'kcal', COALESCE(tdee, 2000),
        'protein_g', COALESCE(protein_g, 150),
        'carbs_g', COALESCE((tdee * 0.4 / 4), 200),
        'fat_g', COALESCE((tdee * 0.3 / 9), 67)
      ) INTO v_targets
      FROM public.user_metrics
      WHERE user_id = OLD.user_id;

      INSERT INTO public.day_rollups (user_id, date, totals, targets, meal_count, updated_at)
      VALUES (OLD.user_id, v_date, v_totals, v_targets, v_meal_count, now())
      ON CONFLICT (user_id, date) DO UPDATE SET
        totals = EXCLUDED.totals,
        meal_count = EXCLUDED.meal_count,
        updated_at = now();
    END IF;

    RETURN OLD;
  ELSE
    v_date := DATE(NEW.eaten_at);

    -- Calculate totals for the day
    SELECT
      jsonb_build_object(
        'kcal', SUM((totals->>'kcal')::float),
        'protein_g', SUM((totals->>'protein_g')::float),
        'carbs_g', SUM((totals->>'carbs_g')::float),
        'fat_g', SUM((totals->>'fat_g')::float),
        'fiber_g', SUM(COALESCE(fiber_g, 0)),
        'tef_kcal', SUM((totals->>'tef_kcal')::float),
        'net_kcal', SUM((totals->>'kcal')::float) - SUM((totals->>'tef_kcal')::float)
      ),
      COUNT(*),
      MAX(eaten_at)
    INTO v_totals, v_meal_count, v_last_meal_time
    FROM public.meals
    WHERE user_id = NEW.user_id AND DATE(eaten_at) = v_date;

    -- Get user targets (from user_metrics or mentor_plan)
    SELECT jsonb_build_object(
      'kcal', COALESCE(tdee, 2000),
      'protein_g', COALESCE(protein_g, 150),
      'carbs_g', COALESCE((tdee * 0.4 / 4), 200),
      'fat_g', COALESCE((tdee * 0.3 / 9), 67)
    ) INTO v_targets
    FROM public.user_metrics
    WHERE user_id = NEW.user_id;

    -- Upsert day_rollup
    INSERT INTO public.day_rollups (
      user_id, date, totals, targets,
      delta, completion, meal_count, updated_at
    )
    VALUES (
      NEW.user_id,
      v_date,
      v_totals,
      v_targets,
      jsonb_build_object(
        'kcal_diff', (v_totals->>'kcal')::float - COALESCE((v_targets->>'kcal')::float, 2000),
        'protein_diff', (v_totals->>'protein_g')::float - COALESCE((v_targets->>'protein_g')::float, 150)
      ),
      jsonb_build_object(
        'kcal_pct', ROUND((v_totals->>'kcal')::float / COALESCE((v_targets->>'kcal')::float, 2000) * 100),
        'protein_pct', ROUND((v_totals->>'protein_g')::float / COALESCE((v_targets->>'protein_g')::float, 150) * 100),
        'meals_logged', v_meal_count,
        'last_meal_time', v_last_meal_time
      ),
      v_meal_count,
      now()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      totals = EXCLUDED.totals,
      targets = EXCLUDED.targets,
      delta = EXCLUDED.delta,
      completion = EXCLUDED.completion,
      meal_count = EXCLUDED.meal_count,
      updated_at = now();

    RETURN NEW;
  END IF;
END;
$$;

-- Drop old trigger and recreate on 'meals' table
DROP TRIGGER IF EXISTS meal_logs_update_rollup ON public.meals;
CREATE TRIGGER meals_update_rollup
  AFTER INSERT OR UPDATE OR DELETE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_day_rollup();

-- ========== PART 8: COMMENTS FOR DOCUMENTATION ==========

COMMENT ON TABLE public.meals IS 'Canonical parent table for meal logging. Each meal must belong to a chat_session (session_id FK). Renamed from meal_logs in migration 20251009000000.';
COMMENT ON COLUMN public.meals.session_id IS 'FK to chat_sessions. Links meals to 24-hour device-based session windows. NOT NULL constraint added after backfill.';
COMMENT ON COLUMN public.meals.fiber_g IS 'Fiber in grams (extracted from micros_totals or computed from meal_items).';
COMMENT ON COLUMN public.meals.name IS 'Meal name/slot (breakfast, lunch, dinner, snack, or free-form name).';
COMMENT ON COLUMN public.meals.eaten_at IS 'Timestamp when meal was consumed (renamed from ts).';
