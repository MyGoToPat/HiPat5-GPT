/*
  # Dashboard Metrics Wrapper RPC

  1. New Functions
    - `get_dashboard_metrics(user_id)` 
      - Returns workouts count, day streak, and achievements count in one call
      - Optimizes frontend performance by reducing round-trips

  2. Security
    - Function granted to authenticated users
    - Uses existing security definer functions for calculations
*/

create or replace function public.get_dashboard_metrics(user_id uuid)
returns table(workouts int, day_streak int, achievements int)
language sql security definer set search_path=public as $$
  select
    public.calculate_user_workout_count(user_id),
    public.calculate_user_day_streak(user_id),
    public.calculate_user_achievements_earned(user_id);
$$;

grant execute on function public.get_dashboard_metrics(uuid) to authenticated;