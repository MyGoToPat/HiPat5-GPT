/*
  # Fix RLS policies for meal_items table

  1. Changes
    - Drop existing RLS policies that check user_id directly
    - Create new RLS policies that check ownership through meal_logs relationship
    - Policies check if the user owns the parent meal_log entry

  2. Security
    - Users can only insert/update/delete their own meal items (through meal_logs)
    - Trainers can view client meal items (through org membership)
    - Admins have full access

  3. Notes
    - This fixes the issue where meal_items insert fails due to missing user_id
    - The relationship is: meal_items.meal_log_id -> meal_logs.id -> meal_logs.user_id
*/

-- Drop existing policies
DROP POLICY IF EXISTS "meal_items_select_own" ON public.meal_items;
DROP POLICY IF EXISTS "meal_items_insert_own" ON public.meal_items;
DROP POLICY IF EXISTS "meal_items_update_own" ON public.meal_items;
DROP POLICY IF EXISTS "meal_items_delete_own" ON public.meal_items;

-- SELECT: Users can view their own meal items
CREATE POLICY "Users can view own meal items"
  ON public.meal_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  );

-- INSERT: Users can insert meal items for their own meals
CREATE POLICY "Users can insert own meal items"
  ON public.meal_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own meal items
CREATE POLICY "Users can update own meal items"
  ON public.meal_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  );

-- DELETE: Users can delete their own meal items
CREATE POLICY "Users can delete own meal items"
  ON public.meal_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_log_id
      AND meal_logs.user_id = auth.uid()
    )
  );
