/*
  # Create achievement definitions table

  1. New Tables
    - `achievement_definitions`
      - `id` (text, primary key - e.g., 'first_workout', '7_day_streak')
      - `name` (text - display name)
      - `description` (text - description of achievement)
      - `category` (text - fitness, nutrition, sleep, consistency)
      - `icon` (text - icon identifier for UI)
      - `target_value` (numeric - target to reach for achievement)
      - `target_metric` (text - what metric to track)
      - `is_active` (boolean - whether achievement is currently available)
      - `sort_order` (integer - display order)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `achievement_definitions` table
    - Add policy for authenticated users to read all achievement definitions
    - Add policy for admins to manage achievement definitions

  3. Sample Data
    - Insert common achievements for fitness tracking
*/

CREATE TABLE IF NOT EXISTS achievement_definitions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  icon text NOT NULL DEFAULT 'trophy',
  target_value numeric NOT NULL DEFAULT 1,
  target_metric text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE achievement_definitions ADD CONSTRAINT achievement_definitions_category_check 
  CHECK (category IN ('fitness', 'nutrition', 'sleep', 'consistency', 'general'));

ALTER TABLE achievement_definitions ADD CONSTRAINT achievement_definitions_target_positive 
  CHECK (target_value > 0);

-- Create indexes
CREATE INDEX IF NOT EXISTS achievement_definitions_category_idx ON achievement_definitions(category);
CREATE INDEX IF NOT EXISTS achievement_definitions_active_idx ON achievement_definitions(is_active);
CREATE INDEX IF NOT EXISTS achievement_definitions_sort_idx ON achievement_definitions(sort_order);

-- Enable RLS
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read active achievement definitions"
  ON achievement_definitions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage achievement definitions"
  ON achievement_definitions
  FOR ALL
  TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Insert sample achievement definitions
INSERT INTO achievement_definitions (id, name, description, category, icon, target_value, target_metric, sort_order) VALUES
  ('first_workout', 'First Workout', 'Complete your first workout session', 'fitness', 'dumbbell', 1, 'workout_count', 1),
  ('first_meal_log', 'First Meal', 'Log your first meal with Pat', 'nutrition', 'utensils', 1, 'meal_count', 2),
  ('3_day_streak', '3-Day Streak', 'Stay active for 3 consecutive days', 'consistency', 'flame', 3, 'daily_streak', 3),
  ('7_day_streak', 'Week Warrior', 'Maintain a 7-day activity streak', 'consistency', 'calendar', 7, 'daily_streak', 4),
  ('first_sleep_log', 'Good Night', 'Log your first sleep session', 'sleep', 'moon', 1, 'sleep_count', 5),
  ('10_workouts', 'Workout Regular', 'Complete 10 total workouts', 'fitness', 'target', 10, 'workout_count', 6),
  ('21_day_habit', 'Habit Master', 'Build a 21-day activity habit', 'consistency', 'trophy', 21, 'daily_streak', 7),
  ('protein_goal_week', 'Protein Pro', 'Hit your protein target for 7 days', 'nutrition', 'zap', 7, 'protein_days', 8),
  ('early_bird', 'Early Bird', 'Log 5 workouts before 8 AM', 'fitness', 'sunrise', 5, 'morning_workouts', 9),
  ('50_workouts', 'Fitness Fanatic', 'Complete 50 total workouts', 'fitness', 'award', 50, 'workout_count', 10)
ON CONFLICT (id) DO NOTHING;