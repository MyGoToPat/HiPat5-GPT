/*
  # Create daily activity tracking table

  1. New Tables
    - `daily_activity_summary`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `activity_date` (date)
      - `had_workout` (boolean, default false)
      - `logged_meals` (integer, default 0)
      - `logged_sleep` (boolean, default false)
      - `chat_interactions` (integer, default 0)
      - `total_calories` (integer, default 0)
      - `activity_score` (integer, 0-100 scale for overall daily activity)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `daily_activity_summary` table
    - Add policy for users to read their own daily activity
    - Add policy for users to upsert their own daily activity
    - Add policy for admins to read all daily activity

  3. Indexes
    - Index on user_id for fast user queries
    - Index on activity_date for date-based queries
    - Index on user_id + activity_date for combined queries
    - Unique constraint on user_id + activity_date (one record per user per day)

  4. Purpose
    - This table enables calculation of "Day Streak" by tracking daily engagement
    - Aggregates activity from multiple sources (workouts, meals, sleep, chat)
    - Provides foundation for consistency scoring and streak calculations
*/

CREATE TABLE IF NOT EXISTS daily_activity_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  had_workout boolean DEFAULT false,
  logged_meals integer DEFAULT 0,
  logged_sleep boolean DEFAULT false,
  chat_interactions integer DEFAULT 0,
  total_calories integer DEFAULT 0,
  activity_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE daily_activity_summary ADD CONSTRAINT daily_activity_logged_meals_positive 
  CHECK (logged_meals >= 0);

ALTER TABLE daily_activity_summary ADD CONSTRAINT daily_activity_chat_positive 
  CHECK (chat_interactions >= 0);

ALTER TABLE daily_activity_summary ADD CONSTRAINT daily_activity_calories_positive 
  CHECK (total_calories >= 0);

ALTER TABLE daily_activity_summary ADD CONSTRAINT daily_activity_score_range 
  CHECK (activity_score >= 0 AND activity_score <= 100);

-- Add unique constraint to ensure one record per user per day
ALTER TABLE daily_activity_summary ADD CONSTRAINT daily_activity_user_date_unique 
  UNIQUE (user_id, activity_date);

-- Create indexes
CREATE INDEX IF NOT EXISTS daily_activity_user_id_idx ON daily_activity_summary(user_id);
CREATE INDEX IF NOT EXISTS daily_activity_date_idx ON daily_activity_summary(activity_date);
CREATE INDEX IF NOT EXISTS daily_activity_user_date_idx ON daily_activity_summary(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS daily_activity_score_idx ON daily_activity_summary(activity_score) WHERE activity_score > 0;

-- Enable RLS
ALTER TABLE daily_activity_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own daily activity"
  ON daily_activity_summary
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own daily activity"
  ON daily_activity_summary
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily activity"
  ON daily_activity_summary
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all daily activity"
  ON daily_activity_summary
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can manage all daily activity"
  ON daily_activity_summary
  FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_activity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_daily_activity_updated_at
  BEFORE UPDATE ON daily_activity_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_activity_updated_at();