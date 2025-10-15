/*
  # Clear Test Meals for Energy Reset Issue

  This migration helps diagnose the energy reset issue by:
  1. Showing what meals exist in the affected time range
  2. Optionally clearing test meals if needed

  DO NOT RUN IN PRODUCTION WITHOUT BACKUP
*/

-- Check what meals exist for the test user in October 14-15
DO $$
DECLARE
  meal_record record;
BEGIN
  RAISE NOTICE '=== MEALS FOR USER ba6eba64-9a14-47d5-80d3-5f5af3e71c1c ===';

  FOR meal_record IN
    SELECT
      ml.id,
      ml.ts,
      ml.ts AT TIME ZONE 'America/New_York' as ts_et,
      ml.meal_slot,
      COUNT(mi.id) as items,
      ROUND(SUM(mi.energy_kcal))::integer as total_kcal
    FROM meal_logs ml
    LEFT JOIN meal_items mi ON mi.meal_log_id = ml.id
    WHERE ml.user_id = 'ba6eba64-9a14-47d5-80d3-5f5af3e71c1c'
      AND ml.ts >= '2025-10-14T00:00:00+00:00'
      AND ml.ts < '2025-10-16T00:00:00+00:00'
    GROUP BY ml.id, ml.ts, ml.meal_slot
    ORDER BY ml.ts DESC
  LOOP
    RAISE NOTICE 'Meal ID: %, TS: %, TS_ET: %, Slot: %, Items: %, Kcal: %',
      meal_record.id,
      meal_record.ts,
      meal_record.ts_et,
      meal_record.meal_slot,
      meal_record.items,
      meal_record.total_kcal;
  END LOOP;

  RAISE NOTICE '=== END MEALS LIST ===';
END $$;

-- OPTIONAL: Uncomment below to DELETE meals from October 14 ONLY (keeps today's meals)
-- This preserves weekly/monthly historical data while fixing today's display
/*
DELETE FROM meal_items
WHERE meal_log_id IN (
  SELECT id FROM meal_logs
  WHERE user_id = 'ba6eba64-9a14-47d5-80d3-5f5af3e71c1c'
    AND ts >= '2025-10-14T04:01:00+00:00'
    AND ts < '2025-10-15T04:01:00+00:00'
);

DELETE FROM meal_logs
WHERE user_id = 'ba6eba64-9a14-47d5-80d3-5f5af3e71c1c'
  AND ts >= '2025-10-14T04:01:00+00:00'
  AND ts < '2025-10-15T04:01:00+00:00';
*/
