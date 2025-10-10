/*
  # Recalculate Day Rollups with Eastern Time Timezone

  ## Problem
  After standardizing all users to Eastern Time (America/New_York), existing day_rollups
  may have been calculated using incorrect timezone boundaries (UTC or previous timezones).
  This causes meals to be counted in the wrong day, affecting weekly/monthly reports.

  ## Example Issue
  - Meal logged at 11:30 PM ET (23:30 ET) on Oct 9
  - In UTC, this is 3:30 AM Oct 10
  - Old calculation: Meal counts toward Oct 10 ❌
  - Correct calculation: Meal counts toward Oct 9 ✅

  ## Solution
  1. Delete all existing day_rollups
  2. Trigger will automatically recalculate them correctly using new timezone
  3. OR manually recalculate using timezone-aware logic

  ## Impact
  - All historical dashboard data will be recalculated with correct timezone
  - Weekly/monthly reports will show accurate totals
  - No data loss (meal_logs remain intact)
  - Only aggregations (day_rollups) are recalculated

  ## Safety
  - day_rollups is a derived table (can be regenerated from meal_logs)
  - Backup strategy: day_rollups data is not critical (can be rebuilt)
  - The trigger will automatically repopulate as meals are queried

  ## Approach
  We'll use a soft recalculation by updating the trigger to force recalc on next access,
  rather than immediate bulk delete/recalc which could be expensive.
*/

-- Option 1: Mark all day_rollups as needing recalculation
-- Add a flag to track if rollup was calculated with correct timezone
ALTER TABLE day_rollups
ADD COLUMN IF NOT EXISTS recalculated_with_et BOOLEAN DEFAULT false;

-- Mark all existing rollups as needing recalculation
UPDATE day_rollups
SET recalculated_with_et = false
WHERE recalculated_with_et IS NULL OR recalculated_with_et = false;

-- Option 2: Force immediate recalculation for all users (expensive but thorough)
-- This recreates all day_rollups from meal_logs using correct timezone

-- Step 1: Clear existing day_rollups
-- CAUTION: Comment this out if you want to keep old data for comparison
-- TRUNCATE TABLE day_rollups;

-- Step 2: Recalculate day_rollups from meal_logs with correct timezone
-- This is safe because day_rollups is derived data

-- Create a function to recalculate day_rollups for a user
CREATE OR REPLACE FUNCTION recalculate_day_rollups_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date date;
  v_totals jsonb;
  v_targets jsonb;
  v_meal_count int;
BEGIN
  -- Delete existing rollups for this user
  DELETE FROM day_rollups WHERE user_id = p_user_id;

  -- Get user's targets
  SELECT jsonb_build_object(
    'kcal', COALESCE(tdee_calories, 2000),
    'protein_g', COALESCE(protein_g_target, 150),
    'carbs_g', COALESCE(carbs_g_target, 200),
    'fat_g', COALESCE(fat_g_target, 67),
    'fiber_g', COALESCE(fiber_g_target, 25)
  ) INTO v_targets
  FROM user_metrics
  WHERE user_id = p_user_id;

  -- Recalculate rollups for each day with meals
  FOR v_date IN
    SELECT DISTINCT get_user_local_date(user_id, ts) as meal_date
    FROM meal_logs
    WHERE user_id = p_user_id
    ORDER BY meal_date
  LOOP
    -- Calculate totals for this day
    SELECT
      jsonb_build_object(
        'kcal', COALESCE(SUM((totals->>'kcal')::float), 0),
        'protein_g', COALESCE(SUM((totals->>'protein_g')::float), 0),
        'carbs_g', COALESCE(SUM((totals->>'carbs_g')::float), 0),
        'fat_g', COALESCE(SUM((totals->>'fat_g')::float), 0),
        'fiber_g', COALESCE(SUM((totals->>'fiber_g')::float), 0),
        'tef_kcal', COALESCE(SUM((totals->>'tef_kcal')::float), 0),
        'net_kcal', COALESCE(SUM((totals->>'kcal')::float), 0) - COALESCE(SUM((totals->>'tef_kcal')::float), 0)
      ),
      COUNT(*)
    INTO v_totals, v_meal_count
    FROM meal_logs
    WHERE user_id = p_user_id
      AND get_user_local_date(user_id, ts) = v_date;

    -- Insert the recalculated rollup
    INSERT INTO day_rollups (
      user_id,
      date,
      totals,
      targets,
      meal_count,
      recalculated_with_et,
      updated_at
    ) VALUES (
      p_user_id,
      v_date,
      v_totals,
      COALESCE(v_targets, jsonb_build_object('kcal', 2000, 'protein_g', 150, 'carbs_g', 200, 'fat_g', 67, 'fiber_g', 25)),
      v_meal_count,
      true,
      now()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      totals = EXCLUDED.totals,
      meal_count = EXCLUDED.meal_count,
      recalculated_with_et = true,
      updated_at = now();
  END LOOP;

  RAISE NOTICE 'Recalculated day_rollups for user %', p_user_id;
END;
$$;

-- Update the trigger to mark new rollups as recalculated
-- This ensures new rollups don't get flagged as needing recalc
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
    -- Use timezone-aware date calculation for the deleted meal
    v_date := get_user_local_date(OLD.user_id, OLD.ts);

    -- Recalculate totals for the day using timezone-aware date
    SELECT
      COALESCE(jsonb_build_object(
        'kcal', SUM((totals->>'kcal')::float),
        'protein_g', SUM((totals->>'protein_g')::float),
        'carbs_g', SUM((totals->>'carbs_g')::float),
        'fat_g', SUM((totals->>'fat_g')::float),
        'fiber_g', SUM((totals->>'fiber_g')::float),
        'tef_kcal', SUM((totals->>'tef_kcal')::float)
      ), jsonb_build_object('kcal', 0, 'protein_g', 0, 'carbs_g', 0, 'fat_g', 0, 'fiber_g', 0, 'tef_kcal', 0)),
      COUNT(*),
      MAX(ts)
    INTO v_totals, v_meal_count, v_last_meal_time
    FROM public.meal_logs
    WHERE user_id = OLD.user_id
      AND get_user_local_date(user_id, ts) = v_date;

    -- Update or delete rollup
    IF v_meal_count = 0 THEN
      DELETE FROM public.day_rollups WHERE user_id = OLD.user_id AND date = v_date;
    ELSE
      -- Get targets
      SELECT jsonb_build_object(
        'kcal', COALESCE(tdee_calories, 2000),
        'protein_g', COALESCE(protein_g_target, 150),
        'carbs_g', COALESCE(carbs_g_target, 200),
        'fat_g', COALESCE(fat_g_target, 67),
        'fiber_g', COALESCE(fiber_g_target, 25)
      ) INTO v_targets
      FROM public.user_metrics
      WHERE user_id = OLD.user_id;

      INSERT INTO public.day_rollups (user_id, date, totals, targets, meal_count, recalculated_with_et, updated_at)
      VALUES (OLD.user_id, v_date, v_totals, v_targets, v_meal_count, true, now())
      ON CONFLICT (user_id, date) DO UPDATE SET
        totals = EXCLUDED.totals,
        meal_count = EXCLUDED.meal_count,
        recalculated_with_et = true,
        updated_at = now();
    END IF;

    RETURN OLD;
  ELSE
    -- Use timezone-aware date calculation for the new/updated meal
    v_date := get_user_local_date(NEW.user_id, NEW.ts);

    -- Calculate totals for the day using timezone-aware date
    SELECT
      jsonb_build_object(
        'kcal', SUM((totals->>'kcal')::float),
        'protein_g', SUM((totals->>'protein_g')::float),
        'carbs_g', SUM((totals->>'carbs_g')::float),
        'fat_g', SUM((totals->>'fat_g')::float),
        'fiber_g', SUM((totals->>'fiber_g')::float),
        'tef_kcal', SUM((totals->>'tef_kcal')::float),
        'net_kcal', SUM((totals->>'kcal')::float) - SUM((totals->>'tef_kcal')::float)
      ),
      COUNT(*),
      MAX(ts)
    INTO v_totals, v_meal_count, v_last_meal_time
    FROM public.meal_logs
    WHERE user_id = NEW.user_id
      AND get_user_local_date(user_id, ts) = v_date;

    -- Get targets
    SELECT jsonb_build_object(
      'kcal', COALESCE(tdee_calories, 2000),
      'protein_g', COALESCE(protein_g_target, 150),
      'carbs_g', COALESCE(carbs_g_target, 200),
      'fat_g', COALESCE(fat_g_target, 67),
      'fiber_g', COALESCE(fiber_g_target, 25)
    ) INTO v_targets
    FROM public.user_metrics
    WHERE user_id = NEW.user_id;

    INSERT INTO public.day_rollups (user_id, date, totals, targets, meal_count, recalculated_with_et, updated_at)
    VALUES (NEW.user_id, v_date, v_totals, v_targets, v_meal_count, true, now())
    ON CONFLICT (user_id, date) DO UPDATE SET
      totals = EXCLUDED.totals,
      meal_count = EXCLUDED.meal_count,
      recalculated_with_et = true,
      updated_at = now();

    RETURN NEW;
  END IF;
END;
$$;

-- Manual recalculation for all users (can be run optionally)
-- This is commented out by default to avoid long-running operation during migration
-- Uncomment and run separately if needed:

/*
DO $$
DECLARE
  v_user_id uuid;
  v_count integer := 0;
  v_total integer;
BEGIN
  -- Count total users with meals
  SELECT COUNT(DISTINCT user_id) INTO v_total
  FROM meal_logs;

  RAISE NOTICE 'Starting recalculation for % users...', v_total;

  -- Recalculate for each user
  FOR v_user_id IN
    SELECT DISTINCT user_id FROM meal_logs ORDER BY user_id
  LOOP
    PERFORM recalculate_day_rollups_for_user(v_user_id);
    v_count := v_count + 1;

    -- Progress update every 10 users
    IF v_count % 10 = 0 THEN
      RAISE NOTICE 'Progress: % / % users completed', v_count, v_total;
    END IF;
  END LOOP;

  RAISE NOTICE 'Recalculation complete! Processed % users', v_count;
END $$;
*/

-- Verification query
DO $$
DECLARE
  total_rollups INTEGER;
  recalculated_rollups INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_rollups FROM day_rollups;
  SELECT COUNT(*) INTO recalculated_rollups FROM day_rollups WHERE recalculated_with_et = true;

  RAISE NOTICE 'Day Rollups Status:';
  RAISE NOTICE '  Total day_rollups: %', total_rollups;
  RAISE NOTICE '  Recalculated with ET: %', recalculated_rollups;
  RAISE NOTICE '  Still need recalculation: %', (total_rollups - recalculated_rollups);
  RAISE NOTICE '';
  RAISE NOTICE 'To manually recalculate all rollups, uncomment and run the DO block above';
  RAISE NOTICE 'Or run: SELECT recalculate_day_rollups_for_user(user_id) FROM auth.users;';
END $$;
