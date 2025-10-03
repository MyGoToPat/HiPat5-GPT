/*
  # Update Day Rollups to Use Timezone-Aware Date Calculation
  
  ## Problem
  The current day_rollups trigger uses naive DATE(ts) extraction which doesn't account
  for user timezones. This causes meals logged late at night (e.g., Oct 2 at 11:30 PM)
  to incorrectly count toward the next day if the user is in a timezone where it's
  already Oct 3 in UTC.
  
  ## Solution
  Update the update_day_rollup() trigger function to:
  1. Use get_user_local_date() to convert timestamps to user's local date
  2. Ensure meals are aggregated based on user's local day (12:01 AM - 12:00 PM midnight)
  3. Handle timezone correctly for day boundaries
  
  ## Changes
  - Replace DATE(ts) with get_user_local_date(user_id, ts)
  - Update all date calculations in the trigger to be timezone-aware
  - Ensure day_rollups.date represents user's local date, not UTC date
  
  ## Impact
  - Existing day_rollups will use correct timezone boundaries going forward
  - Historical data may need reprocessing (can be done separately)
  - Dashboard queries will show accurate daily totals
*/

-- Drop and recreate the update_day_rollup trigger function with timezone awareness
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
        'tef_kcal', SUM((totals->>'tef_kcal')::float)
      ), jsonb_build_object('kcal', 0, 'protein_g', 0, 'carbs_g', 0, 'fat_g', 0, 'tef_kcal', 0)),
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
    -- Use timezone-aware date calculation for the new/updated meal
    v_date := get_user_local_date(NEW.user_id, NEW.ts);

    -- Calculate totals for the day using timezone-aware date
    SELECT
      jsonb_build_object(
        'kcal', SUM((totals->>'kcal')::float),
        'protein_g', SUM((totals->>'protein_g')::float),
        'carbs_g', SUM((totals->>'carbs_g')::float),
        'fat_g', SUM((totals->>'fat_g')::float),
        'tef_kcal', SUM((totals->>'tef_kcal')::float),
        'net_kcal', SUM((totals->>'kcal')::float) - SUM((totals->>'tef_kcal')::float)
      ),
      COUNT(*),
      MAX(ts)
    INTO v_totals, v_meal_count, v_last_meal_time
    FROM public.meal_logs
    WHERE user_id = NEW.user_id 
      AND get_user_local_date(user_id, ts) = v_date;

    -- Get user targets (from user_metrics or mentor_plan)
    SELECT jsonb_build_object(
      'kcal', COALESCE(tdee, 2000),
      'protein_g', COALESCE(protein_g, 150),
      'carbs_g', COALESCE((tdee * 0.4 / 4), 200),
      'fat_g', COALESCE((tdee * 0.3 / 9), 67)
    ) INTO v_targets
    FROM public.user_metrics
    WHERE user_id = NEW.user_id;

    -- TODO: Override with mentor_plan targets if active_org_id exists

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

-- The trigger is already created, this just updates the function
-- Verify trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'meal_logs_update_rollup'
  ) THEN
    CREATE TRIGGER meal_logs_update_rollup
      AFTER INSERT OR UPDATE OR DELETE ON public.meal_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.update_day_rollup();
  END IF;
END $$;

-- Create helper function to get day boundaries for a user's local date
CREATE OR REPLACE FUNCTION get_user_day_boundaries(
  p_user_id uuid,
  p_local_date date DEFAULT NULL
)
RETURNS TABLE(day_start timestamptz, day_end timestamptz)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_timezone text;
  v_local_date date;
BEGIN
  -- Get user's timezone
  SELECT COALESCE(timezone, 'UTC')
  INTO v_timezone
  FROM user_preferences
  WHERE user_id = p_user_id;
  
  -- Use provided date or today
  v_local_date := COALESCE(p_local_date, (now() AT TIME ZONE v_timezone)::date);
  
  -- Calculate boundaries: 12:01 AM to 11:59:59.999 PM in user's local timezone
  -- Note: Using 00:01:00 as start to match your requirement of 12:01 AM
  RETURN QUERY
  SELECT 
    (v_local_date::text || ' 00:01:00')::timestamp AT TIME ZONE v_timezone AS day_start,
    (v_local_date::text || ' 23:59:59.999')::timestamp AT TIME ZONE v_timezone AS day_end;
END;
$$;
