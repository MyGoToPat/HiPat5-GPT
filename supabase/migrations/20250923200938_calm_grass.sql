/*
  # Create sleep logs table

  1. New Tables
    - `sleep_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `sleep_date` (date)
      - `bedtime` (time)
      - `wake_time` (time)
      - `duration_minutes` (integer)
      - `quality_score` (integer, 1-100 scale)
      - `deep_sleep_minutes` (integer, default 0)
      - `rem_sleep_minutes` (integer, default 0)
      - `light_sleep_minutes` (integer, default 0)
      - `wakenings` (integer, default 0)
      - `sleep_debt_minutes` (integer, optional - cumulative sleep debt)
      - `notes` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `sleep_logs` table
    - Add policy for users to read their own sleep logs
    - Add policy for users to insert their own sleep logs
    - Add policy for users to update their own sleep logs
    - Add policy for users to delete their own sleep logs
    - Add policy for admins to read all sleep logs

  3. Indexes
    - Index on user_id for fast user queries
    - Index on sleep_date for date-based queries
    - Index on user_id + sleep_date for combined queries
*/

CREATE TABLE IF NOT EXISTS sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sleep_date date NOT NULL DEFAULT CURRENT_DATE,
  bedtime time DEFAULT NULL,
  wake_time time DEFAULT NULL,
  duration_minutes integer NOT NULL DEFAULT 0,
  quality_score integer DEFAULT NULL,
  deep_sleep_minutes integer DEFAULT 0,
  rem_sleep_minutes integer DEFAULT 0,
  light_sleep_minutes integer DEFAULT 0,
  wakenings integer DEFAULT 0,
  sleep_debt_minutes integer DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE sleep_logs ADD CONSTRAINT sleep_logs_duration_positive 
  CHECK (duration_minutes >= 0);

ALTER TABLE sleep_logs ADD CONSTRAINT sleep_logs_quality_range 
  CHECK (quality_score IS NULL OR (quality_score >= 1 AND quality_score <= 100));

ALTER TABLE sleep_logs ADD CONSTRAINT sleep_logs_deep_positive 
  CHECK (deep_sleep_minutes >= 0);

ALTER TABLE sleep_logs ADD CONSTRAINT sleep_logs_rem_positive 
  CHECK (rem_sleep_minutes >= 0);

ALTER TABLE sleep_logs ADD CONSTRAINT sleep_logs_light_positive 
  CHECK (light_sleep_minutes >= 0);

ALTER TABLE sleep_logs ADD CONSTRAINT sleep_logs_wakenings_positive 
  CHECK (wakenings >= 0);

-- Create indexes
CREATE INDEX IF NOT EXISTS sleep_logs_user_id_idx ON sleep_logs(user_id);
CREATE INDEX IF NOT EXISTS sleep_logs_sleep_date_idx ON sleep_logs(sleep_date);
CREATE INDEX IF NOT EXISTS sleep_logs_user_date_idx ON sleep_logs(user_id, sleep_date DESC);

-- Enable RLS
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own sleep logs"
  ON sleep_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sleep logs"
  ON sleep_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep logs"
  ON sleep_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sleep logs"
  ON sleep_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all sleep logs"
  ON sleep_logs
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');