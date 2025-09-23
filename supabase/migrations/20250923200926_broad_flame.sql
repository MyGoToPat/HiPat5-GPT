/*
  # Create workout logs table

  1. New Tables
    - `workout_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `workout_date` (date)
      - `duration_minutes` (integer)
      - `workout_type` (text - resistance, cardio, hybrid, recovery)
      - `calories_burned` (integer, optional)
      - `exercises_completed` (integer, default 0)
      - `volume_lbs` (numeric, optional - total weight moved)
      - `avg_rpe` (numeric, optional - average rate of perceived exertion 1-10)
      - `notes` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `workout_logs` table
    - Add policy for users to read their own workout logs
    - Add policy for users to insert their own workout logs
    - Add policy for users to update their own workout logs
    - Add policy for users to delete their own workout logs
    - Add policy for admins to read all workout logs

  3. Indexes
    - Index on user_id for fast user queries
    - Index on workout_date for date-based queries
    - Index on user_id + workout_date for combined queries
*/

CREATE TABLE IF NOT EXISTS workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workout_date date NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes integer NOT NULL DEFAULT 0,
  workout_type text NOT NULL DEFAULT 'resistance',
  calories_burned integer DEFAULT NULL,
  exercises_completed integer DEFAULT 0,
  volume_lbs numeric DEFAULT NULL,
  avg_rpe numeric DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_workout_type_check 
  CHECK (workout_type IN ('resistance', 'cardio', 'hybrid', 'recovery'));

ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_duration_positive 
  CHECK (duration_minutes >= 0);

ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_exercises_positive 
  CHECK (exercises_completed >= 0);

ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_calories_positive 
  CHECK (calories_burned IS NULL OR calories_burned >= 0);

ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_rpe_range 
  CHECK (avg_rpe IS NULL OR (avg_rpe >= 1 AND avg_rpe <= 10));

-- Create indexes
CREATE INDEX IF NOT EXISTS workout_logs_user_id_idx ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS workout_logs_workout_date_idx ON workout_logs(workout_date);
CREATE INDEX IF NOT EXISTS workout_logs_user_date_idx ON workout_logs(user_id, workout_date DESC);

-- Enable RLS
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own workout logs"
  ON workout_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout logs"
  ON workout_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout logs"
  ON workout_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout logs"
  ON workout_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all workout logs"
  ON workout_logs
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');