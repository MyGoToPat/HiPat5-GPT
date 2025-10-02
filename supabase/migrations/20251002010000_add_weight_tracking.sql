/*
  # Add Weight Tracking System

  1. New Tables
    - `weight_logs` - Stores user weight entries over time
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `weight_kg` (numeric)
      - `weight_lbs` (numeric) - computed from kg
      - `log_date` (date) - date of measurement
      - `note` (text, optional) - user notes
      - `created_at` (timestamptz)

  2. Updates to existing tables
    - Add goal_weight_kg and goal_weight_date to user_metrics

  3. Security
    - Enable RLS on `weight_logs` table
    - Add policies for users to read/write their own weight logs

  4. Purpose
    - Track weight over time for trend analysis
    - Allow users to log weight manually
    - Support weight goal tracking and progress visualization
*/

-- Create weight_logs table
CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg numeric NOT NULL,
  weight_lbs numeric GENERATED ALWAYS AS (weight_kg * 2.20462) STORED,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, log_date)
);

CREATE INDEX IF NOT EXISTS weight_logs_user_id_idx ON weight_logs(user_id);
CREATE INDEX IF NOT EXISTS weight_logs_log_date_idx ON weight_logs(log_date);
CREATE INDEX IF NOT EXISTS weight_logs_user_date_idx ON weight_logs(user_id, log_date DESC);

-- Enable RLS
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

-- Policies for weight_logs
CREATE POLICY "Users can read own weight logs"
  ON weight_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs"
  ON weight_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs"
  ON weight_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs"
  ON weight_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add goal weight columns to user_metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'goal_weight_kg'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN goal_weight_kg numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_metrics' AND column_name = 'goal_weight_date'
  ) THEN
    ALTER TABLE user_metrics ADD COLUMN goal_weight_date date;
  END IF;
END $$;
