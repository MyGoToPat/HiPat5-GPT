/*
  # Fix Role Constraint to Allow Beta Role

  1. Database Schema Changes
    - Update the role constraint on profiles table to include 'beta' and other roles
    - Ensure RLS policies work with the new roles
    
  2. Security
    - Maintain existing RLS policies
    - No changes to security model, just expanding allowed roles
*/

-- Update the role check constraint to include all app roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check_std;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check_std 
  CHECK (role = ANY (ARRAY['user'::text, 'admin'::text, 'trainer'::text, 'beta'::text, 'paid_user'::text, 'free_user'::text]));