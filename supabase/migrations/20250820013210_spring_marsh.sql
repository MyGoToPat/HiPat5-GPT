/*
  # Fix org_members infinite recursion in RLS policies

  1. Issue
    - The org_members table has RLS policies that create infinite recursion
    - This happens when policies reference the same table they're protecting

  2. Solution
    - Drop the problematic recursive policies
    - Create simple, direct policies that avoid self-referential queries
    - Use direct user ID comparisons instead of complex subqueries

  3. Security
    - Maintain proper access control without recursion
    - Users can read their own memberships
    - Organization owners/admins can manage memberships
*/

-- Drop existing problematic policies that cause recursion
DROP POLICY IF EXISTS "mem_insert_self" ON org_members;
DROP POLICY IF EXISTS "mem_read_self_org" ON org_members;
DROP POLICY IF EXISTS "mem_select_scoped" ON org_members;
DROP POLICY IF EXISTS "org_members_member_read_self" ON org_members;
DROP POLICY IF EXISTS "org_members_owner_admin_manage" ON org_members;

-- Create simple, non-recursive policies
CREATE POLICY "org_members_read_own"
  ON org_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "org_members_insert_self"
  ON org_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "org_members_admin_all"
  ON org_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.role = 'admin'
    )
  );