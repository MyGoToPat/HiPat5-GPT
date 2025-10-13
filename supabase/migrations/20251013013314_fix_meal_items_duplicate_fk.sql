/*
  # Fix Duplicate Foreign Key in meal_items

  ## Problem
  The `meal_items` table has two foreign keys pointing to `meal_logs`:
  - `meal_id` → `meal_logs.id` (old, unused)
  - `meal_log_id` → `meal_logs.id` (current, used everywhere)
  
  This causes Supabase PostgREST to throw PGRST201 ambiguous relationship errors.

  ## Solution
  1. Drop all RLS policies that reference meal_id
  2. Drop the meal_id column
  3. Ensure RLS policies use meal_log_id correctly

  ## Changes
  - Remove 8 RLS policies that depend on meal_id
  - Drop meal_id column
  - Verify meal_log_id foreign key remains
*/

-- Drop all policies that depend on meal_id
DROP POLICY IF EXISTS "Users can read their meal_items" ON meal_items;
DROP POLICY IF EXISTS "Users can insert their meal_items" ON meal_items;
DROP POLICY IF EXISTS "Users can update their meal_items" ON meal_items;
DROP POLICY IF EXISTS "Users can delete their meal_items" ON meal_items;
DROP POLICY IF EXISTS "mi_select" ON meal_items;
DROP POLICY IF EXISTS "mi_insert" ON meal_items;
DROP POLICY IF EXISTS "mi_update" ON meal_items;
DROP POLICY IF EXISTS "mi_delete" ON meal_items;

-- Drop the duplicate meal_id column
ALTER TABLE meal_items DROP COLUMN IF EXISTS meal_id;

-- Recreate RLS policies using meal_log_id correctly
-- Users can only access their own meal items through meal_logs
CREATE POLICY "Users can select their meal_items"
  ON meal_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
        AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their meal_items"
  ON meal_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
        AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their meal_items"
  ON meal_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
        AND meal_logs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
        AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their meal_items"
  ON meal_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
        AND meal_logs.user_id = auth.uid()
    )
  );
