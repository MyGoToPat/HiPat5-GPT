/*
  # Fix get_user_day_boundaries Function

  ## Problem
  The function is returning empty objects `{}` instead of proper day_start and day_end values.
  This causes the dashboard to load ALL meals instead of just today's meals.

  ## Root Cause
  If the user doesn't have a timezone in user_preferences, the function fails silently.

  ## Solution
  1. Add better error handling
  2. Default to 'America/New_York' if no timezone found
  3. Add logging to debug issues
  4. Ensure the function ALWAYS returns valid timestamps
*/

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
  -- Get user's timezone with proper fallback
  SELECT COALESCE(up.timezone, 'America/New_York')
  INTO v_timezone
  FROM user_preferences up
  WHERE up.user_id = p_user_id;

  -- If user has no preferences row, default to America/New_York
  IF v_timezone IS NULL THEN
    v_timezone := 'America/New_York';
    RAISE NOTICE 'No timezone found for user %, defaulting to America/New_York', p_user_id;
  END IF;

  -- Use provided date or calculate today in user's timezone
  IF p_local_date IS NOT NULL THEN
    v_local_date := p_local_date;
  ELSE
    v_local_date := (now() AT TIME ZONE v_timezone)::date;
  END IF;

  -- Calculate boundaries: 12:01 AM to 11:59:59.999 PM in user's local timezone
  -- Using 00:01:00 as start (12:01 AM) and 23:59:59.999 as end (11:59:59 PM)
  RETURN QUERY
  SELECT
    (v_local_date::text || ' 00:01:00')::timestamp AT TIME ZONE v_timezone AS day_start,
    (v_local_date::text || ' 23:59:59.999')::timestamp AT TIME ZONE v_timezone AS day_end;

  RAISE NOTICE 'Calculated boundaries for user % (tz=%): start=%, end=%',
    p_user_id, v_timezone,
    (v_local_date::text || ' 00:01:00')::timestamp AT TIME ZONE v_timezone,
    (v_local_date::text || ' 23:59:59.999')::timestamp AT TIME ZONE v_timezone;
END;
$$;

-- Test the function to ensure it works
DO $$
DECLARE
  test_result record;
BEGIN
  -- Test with a known user
  FOR test_result IN
    SELECT * FROM get_user_day_boundaries('ba6eba64-9a14-47d5-80d3-5f5af3e71c1c'::uuid)
  LOOP
    RAISE NOTICE 'Test result: day_start=%, day_end=%', test_result.day_start, test_result.day_end;
  END LOOP;
END $$;
