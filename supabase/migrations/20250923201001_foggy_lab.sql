/*
  # Create user achievements table

  1. New Tables
    - `user_achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `achievement_id` (text, foreign key to achievement_definitions)
      - `earned_at` (timestamp, nullable - when achievement was earned)
      - `current_progress` (numeric, default 0 - current progress toward achievement)
      - `is_earned` (boolean, default false - whether achievement is completed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_achievements` table
    - Add policy for users to read their own achievements
    - Add policy for users to update their own achievement progress
    - Add policy for system/backend to insert achievement records
    - Add policy for admins to read all user achievements

  3. Indexes
    - Index on user_id for fast user queries
    - Index on achievement_id for achievement-based queries
    - Index on user_id + is_earned for earned achievements
    - Unique constraint on user_id + achievement_id
*/

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT NULL,
  current_progress numeric DEFAULT 0,
  is_earned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_progress_positive 
  CHECK (current_progress >= 0);

ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_earned_consistency 
  CHECK ((is_earned = true AND earned_at IS NOT NULL) OR (is_earned = false));

-- Add unique constraint to prevent duplicate achievement records per user
ALTER TABLE user_achievements ADD CONSTRAINT user_achievements_user_achievement_unique 
  UNIQUE (user_id, achievement_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_achievement_id_idx ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS user_achievements_user_earned_idx ON user_achievements(user_id, is_earned);
CREATE INDEX IF NOT EXISTS user_achievements_earned_at_idx ON user_achievements(earned_at) WHERE earned_at IS NOT NULL;

-- Enable RLS
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own achievements"
  ON user_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own achievement progress"
  ON user_achievements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert achievement records"
  ON user_achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all user achievements"
  ON user_achievements
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can manage all user achievements"
  ON user_achievements
  FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_achievements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_user_achievements_updated_at();