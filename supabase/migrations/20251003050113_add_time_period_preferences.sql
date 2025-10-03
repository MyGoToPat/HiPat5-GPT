/*
  # Add Time Period and Week Start Preferences

  1. Changes to existing tables
    - Add week_start_day to user_preferences (sunday/monday)
    - Add dashboard_default_view to user_preferences (daily/weekly/monthly)
    - Add show_monthly_view to user_preferences (boolean)

  2. Purpose
    - Allow users to configure their preferred week start day (Sunday or Monday)
    - Store user's default dashboard view preference (defaults to daily)
    - Enable/disable monthly trends view access
    - Support flexible weekly rollup calculations based on user preference

  3. Security
    - Uses existing RLS policies on user_preferences table
*/

-- Add week_start_day preference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'week_start_day'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN week_start_day text DEFAULT 'sunday' 
    CHECK (week_start_day IN ('sunday', 'monday'));
  END IF;
END $$;

-- Add dashboard_default_view preference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'dashboard_default_view'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN dashboard_default_view text DEFAULT 'daily' 
    CHECK (dashboard_default_view IN ('daily', 'weekly', 'monthly'));
  END IF;
END $$;

-- Add show_monthly_view preference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'show_monthly_view'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN show_monthly_view boolean DEFAULT true;
  END IF;
END $$;

-- Create helper function to get week boundaries based on user preference
CREATE OR REPLACE FUNCTION get_user_week_boundaries(
  p_user_id uuid,
  p_date date DEFAULT NULL
)
RETURNS TABLE(week_start date, week_end date)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_week_start_day text;
  v_date date;
  v_day_of_week int;
  v_week_start date;
  v_week_end date;
BEGIN
  -- Get user's week start preference
  SELECT COALESCE(week_start_day, 'sunday')
  INTO v_week_start_day
  FROM user_preferences
  WHERE user_id = p_user_id;
  
  -- Use provided date or today
  v_date := COALESCE(p_date, CURRENT_DATE);
  
  -- Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  v_day_of_week := EXTRACT(DOW FROM v_date);
  
  -- Calculate week start based on preference
  IF v_week_start_day = 'sunday' THEN
    -- Week starts on Sunday
    v_week_start := v_date - (v_day_of_week || ' days')::interval;
    v_week_end := v_week_start + interval '6 days';
  ELSE
    -- Week starts on Monday
    IF v_day_of_week = 0 THEN
      -- If today is Sunday, week started yesterday
      v_week_start := v_date - interval '6 days';
    ELSE
      v_week_start := v_date - ((v_day_of_week - 1) || ' days')::interval;
    END IF;
    v_week_end := v_week_start + interval '6 days';
  END IF;
  
  RETURN QUERY SELECT v_week_start, v_week_end;
END;
$$;

-- Create helper function to get calendar month boundaries
CREATE OR REPLACE FUNCTION get_calendar_month_boundaries(
  p_date date DEFAULT NULL
)
RETURNS TABLE(month_start date, month_end date)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_date date;
BEGIN
  -- Use provided date or today
  v_date := COALESCE(p_date, CURRENT_DATE);
  
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', v_date)::date AS month_start,
    (DATE_TRUNC('month', v_date) + interval '1 month' - interval '1 day')::date AS month_end;
END;
$$;