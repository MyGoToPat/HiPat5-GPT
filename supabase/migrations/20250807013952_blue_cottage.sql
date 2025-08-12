/*
  # Complete HiPat Database Schema

  1. New Tables
    - `profiles` - User profile information with role-based access
    - `user_metrics` - BMR, TDEE, and macro calculations
    - `chat_histories` - Chat conversation metadata
    - `chat_messages` - Individual chat messages
    - `food_logs` - Food intake tracking with macro data
    - `timer_presets` - Custom interval timer configurations
    - `upgrade_requests` - User role upgrade requests
    - `role_change_history` - Audit log for role changes

  2. Security
    - Enable RLS on all tables
    - Role-based policies for admin vs user access
    - User isolation for personal data
    - Admin override capabilities for management

  3. Functions and Triggers
    - Helper functions for role checking and timestamp updates
    - Audit triggers for role changes
    - Automatic timestamp management
*/

-- Helper function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  location text,
  dob date,
  bio text,
  beta_user boolean NOT NULL DEFAULT false,
  role text NOT NULL DEFAULT 'free_user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['admin'::text, 'enterprise'::text, 'beta_tester'::text, 'paid_user'::text, 'free_user'::text]))
);

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create user_metrics table
CREATE TABLE IF NOT EXISTS user_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bmr integer,
  tdee integer,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_metrics_user_id_idx ON user_metrics(user_id);

ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

-- Create chat_histories table
CREATE TABLE IF NOT EXISTS chat_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_histories_user_id_idx ON chat_histories(user_id);

ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_history_id uuid NOT NULL REFERENCES chat_histories(id) ON DELETE CASCADE,
  text text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  is_user boolean NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_messages_chat_history_id_idx ON chat_messages(chat_history_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create food_logs table
CREATE TABLE IF NOT EXISTS food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  grams numeric NOT NULL,
  source_db text DEFAULT 'OpenAI LLM',
  macros jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_logs_user_id_idx ON food_logs(user_id);
CREATE INDEX IF NOT EXISTS food_logs_created_at_idx ON food_logs(created_at);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

-- Create timer_presets table
CREATE TABLE IF NOT EXISTS timer_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  intervals jsonb NOT NULL,
  cycles integer NOT NULL,
  total_duration integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used timestamptz
);

CREATE INDEX IF NOT EXISTS timer_presets_user_id_idx ON timer_presets(user_id);

ALTER TABLE timer_presets ENABLE ROW LEVEL SECURITY;

-- Create upgrade_requests table
CREATE TABLE IF NOT EXISTS upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz DEFAULT now(),
  processed_by uuid REFERENCES auth.users(id),
  processed_at timestamptz,
  CONSTRAINT upgrade_requests_requested_role_check CHECK (requested_role = ANY (ARRAY['paid_user'::text, 'beta_tester'::text, 'enterprise'::text])),
  CONSTRAINT upgrade_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text]))
);

CREATE INDEX IF NOT EXISTS idx_upgrade_requests_user_id ON upgrade_requests(user_id);

ALTER TABLE upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Create role_change_history table
CREATE TABLE IF NOT EXISTS role_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_role text NOT NULL,
  new_role text NOT NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  CONSTRAINT role_change_history_old_role_check CHECK (old_role = ANY (ARRAY['admin'::text, 'enterprise'::text, 'beta_tester'::text, 'paid_user'::text, 'free_user'::text])),
  CONSTRAINT role_change_history_new_role_check CHECK (new_role = ANY (ARRAY['admin'::text, 'enterprise'::text, 'beta_tester'::text, 'paid_user'::text, 'free_user'::text]))
);

CREATE INDEX IF NOT EXISTS idx_role_change_history_user_id ON role_change_history(user_id);

ALTER TABLE role_change_history ENABLE ROW LEVEL SECURITY;

-- Function to log role changes
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO role_change_history (user_id, old_role, new_role, changed_by)
    VALUES (NEW.user_id, OLD.role, NEW.role, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing triggers before recreating them
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_log_role_change ON profiles;
CREATE TRIGGER trigger_log_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();

DROP TRIGGER IF EXISTS update_user_metrics_updated_at ON user_metrics;
CREATE TRIGGER update_user_metrics_updated_at
  BEFORE UPDATE ON user_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for profiles table
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can delete any profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- RLS Policies for user_metrics table
CREATE POLICY "Users can read own metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can insert own metrics"
  ON user_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own metrics"
  ON user_metrics
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for chat_histories table
CREATE POLICY "Users can read own chat histories"
  ON chat_histories
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all chat histories"
  ON chat_histories
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can insert own chat histories"
  ON chat_histories
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chat histories"
  ON chat_histories
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chat histories"
  ON chat_histories
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for chat_messages table
CREATE POLICY "Users can read own chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM chat_histories
    WHERE chat_histories.id = chat_messages.chat_history_id
    AND chat_histories.user_id = auth.uid()
  ));

CREATE POLICY "Admins can read all chat messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can insert own chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM chat_histories
    WHERE chat_histories.id = chat_messages.chat_history_id
    AND chat_histories.user_id = auth.uid()
  ));

-- RLS Policies for food_logs table
CREATE POLICY "Users can read own food logs"
  ON food_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all food logs"
  ON food_logs
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can insert own food logs"
  ON food_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own food logs"
  ON food_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own food logs"
  ON food_logs
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for timer_presets table
CREATE POLICY "Users can read own timer presets"
  ON timer_presets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all timer presets"
  ON timer_presets
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Users can insert own timer presets"
  ON timer_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own timer presets"
  ON timer_presets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own timer presets"
  ON timer_presets
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for upgrade_requests table
CREATE POLICY "Users can insert own upgrade requests"
  ON upgrade_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own upgrade requests"
  ON upgrade_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can select upgrade requests"
  ON upgrade_requests
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can update upgrade requests"
  ON upgrade_requests
  FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin');

-- RLS Policies for role_change_history table
CREATE POLICY "Admins can select role change history"
  ON role_change_history
  FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- Drop existing triggers before recreating them
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_log_role_change ON profiles;
CREATE TRIGGER trigger_log_role_change
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_role_change();

DROP TRIGGER IF EXISTS update_user_metrics_updated_at ON user_metrics;
CREATE TRIGGER update_user_metrics_updated_at
  BEFORE UPDATE ON user_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();