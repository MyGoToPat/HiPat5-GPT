/*
  # Dashboard Metrics Wrapper RPC

  1. New Functions
    - `get_dashboard_metrics(user_id uuid)`
      - Returns workouts, day_streak, achievements in one call
      - Optimized for Profile header metrics

  2. Security
    - Grant execute to authenticated users
    - Security definer for consistent access
*/

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(user_id uuid)
RETURNS TABLE(workouts int, day_streak int, achievements int)
LANGUAGE sql 
SECURITY definer 
SET search_path = public 
AS $$
  SELECT
    public.calculate_user_workout_count(user_id),
    public.calculate_user_day_streak(user_id),
    public.calculate_user_achievements_earned(user_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid) TO authenticated;