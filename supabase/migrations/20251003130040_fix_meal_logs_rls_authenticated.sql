/*
  # Fix meal_logs RLS policies to require authentication

  1. Changes
    - Drop existing public RLS policies on meal_logs
    - Recreate policies restricted to authenticated users only
    
  2. Security
    - Ensures only authenticated users can access their meal logs
    - Maintains user ownership checks with auth.uid()
*/

-- Drop existing policies
DROP POLICY IF EXISTS "meal_logs_select_own" ON meal_logs;
DROP POLICY IF EXISTS "meal_logs_insert_own" ON meal_logs;
DROP POLICY IF EXISTS "meal_logs_update_own" ON meal_logs;
DROP POLICY IF EXISTS "meal_logs_delete_own" ON meal_logs;

-- Recreate with authenticated restriction
CREATE POLICY "Users can view own meal logs"
  ON meal_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal logs"
  ON meal_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal logs"
  ON meal_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal logs"
  ON meal_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
