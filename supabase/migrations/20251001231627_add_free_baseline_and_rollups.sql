/*
  # Add FREE Baseline Storage and Weekly Rollups

  1. Changes to existing tables
    - Add FREE baseline columns to user_metrics table
    - Add comparison_window preference to user_preferences table
    - Add consistency tracking to workout_logs

  2. New Tables
    - `free_weekly_rollups` - Stores calculated weekly FREE metrics
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `week_start_date` (date) - Monday of the week
      - `frequency_score` (numeric 0-100)
      - `rest_score` (numeric 0-100)
      - `energy_score` (numeric 0-100)
      - `effort_score` (numeric 0-100)
      - `composite_score` (numeric 0-100) - Weighted average
      - `sessions_count` (int)
      - `avg_sleep_hours` (numeric)
      - `avg_calories` (numeric)
      - `total_volume_lbs` (numeric)
      - `state` (text) - growth, plateau, regression
      - `created_at` (timestamptz)

    - `effort_scores` - Stores calculated effort scores per session
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `workout_log_id` (uuid, optional reference)
      - `session_date` (date)
      - `effort_score` (numeric 0-100)
      - `rpe_component` (numeric)
      - `volume_component` (numeric)
      - `progressive_overload_component` (numeric)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on new tables
    - Add policies for users to read/write their own data

  4. Purpose
    - Store FREE baseline from onboarding for comparison
    - Track weekly rollups for trend analysis
    - Calculate effort scores for intensity tracking
    - Enable growth vs plateau vs regression detection
*/

-- Add baseline columns to user_metrics if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'frequency_baseline'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN frequency_baseline numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'rest_baseline'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN rest_baseline numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'energy_baseline'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN energy_baseline numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'effort_baseline'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN effort_baseline numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'baseline_captured_at'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN baseline_captured_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'consistency_streak'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN consistency_streak int DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'best_streak'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN best_streak int DEFAULT 0;
  END IF;
END $$;

-- Add comparison_window to user_preferences if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'comparison_window'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN comparison_window text DEFAULT 'baseline' CHECK (comparison_window IN ('baseline', '7day', '30day', '90day'));
  END IF;
END $$;

-- Create free_weekly_rollups table
CREATE TABLE IF NOT EXISTS free_weekly_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  frequency_score numeric DEFAULT 0 CHECK (frequency_score >= 0 AND frequency_score <= 100),
  rest_score numeric DEFAULT 0 CHECK (rest_score >= 0 AND rest_score <= 100),
  energy_score numeric DEFAULT 0 CHECK (energy_score >= 0 AND energy_score <= 100),
  effort_score numeric DEFAULT 0 CHECK (effort_score >= 0 AND effort_score <= 100),
  composite_score numeric DEFAULT 0 CHECK (composite_score >= 0 AND composite_score <= 100),
  sessions_count int DEFAULT 0,
  avg_sleep_hours numeric DEFAULT 0,
  avg_calories numeric DEFAULT 0,
  total_volume_lbs numeric DEFAULT 0,
  state text DEFAULT 'plateau' CHECK (state IN ('growth', 'plateau', 'regression')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS free_weekly_rollups_user_id_idx ON free_weekly_rollups(user_id);
CREATE INDEX IF NOT EXISTS free_weekly_rollups_week_start_date_idx ON free_weekly_rollups(week_start_date);

-- Enable RLS
ALTER TABLE free_weekly_rollups ENABLE ROW LEVEL SECURITY;

-- Policies for free_weekly_rollups
CREATE POLICY "Users can read own weekly rollups"
  ON free_weekly_rollups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly rollups"
  ON free_weekly_rollups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly rollups"
  ON free_weekly_rollups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create effort_scores table
CREATE TABLE IF NOT EXISTS effort_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  effort_score numeric DEFAULT 0 CHECK (effort_score >= 0 AND effort_score <= 100),
  rpe_component numeric DEFAULT 0,
  volume_component numeric DEFAULT 0,
  progressive_overload_component numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS effort_scores_user_id_idx ON effort_scores(user_id);
CREATE INDEX IF NOT EXISTS effort_scores_session_date_idx ON effort_scores(session_date);

-- Enable RLS
ALTER TABLE effort_scores ENABLE ROW LEVEL SECURITY;

-- Policies for effort_scores
CREATE POLICY "Users can read own effort scores"
  ON effort_scores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own effort scores"
  ON effort_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own effort scores"
  ON effort_scores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
