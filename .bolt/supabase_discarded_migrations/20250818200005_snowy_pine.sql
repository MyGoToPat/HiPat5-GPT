/*
  # Fix infinite recursion in profiles RLS policies

  This migration resolves two critical issues:

  1. **Infinite Recursion in RLS Policies**
     - Removes policies that cause recursive loops when checking admin status
     - Replaces with simpler, non-recursive policies that don't reference the profiles table within themselves

  2. **Email Unique Constraint Conflict**
     - Drops the unique constraint on the email column
     - Email uniqueness is already enforced by Supabase's auth system
     - This allows profile updates without constraint violations

  3. **Policy Simplification**
     - Consolidates overlapping policies into clear, simple rules
     - Uses direct user ID comparisons instead of role-based subqueries
     - Maintains security while eliminating recursion

  ## Changes Made:
  - Drop problematic recursive policies
  - Drop email unique constraint  
  - Add simple, efficient policies for CRUD operations
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "profiles_admin_all_jwt" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
DROP POLICY IF EXISTS "profiles_owner_all" ON profiles;
DROP POLICY IF EXISTS "profiles_read_self_or_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON profiles;

-- Drop the problematic unique constraint on email
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_email_key' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_email_key;
  END IF;
END $$;

-- Create simple, non-recursive policies
-- Users can read their own profile
CREATE POLICY "profiles_select_own" 
  ON profiles 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own" 
  ON profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Users can update their own profile  
CREATE POLICY "profiles_update_own" 
  ON profiles 
  FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own profile
CREATE POLICY "profiles_delete_own" 
  ON profiles 
  FOR DELETE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Simple admin policy using service role (avoids recursion)
-- This will work for server-side admin operations
CREATE POLICY "profiles_admin_full_access" 
  ON profiles 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);