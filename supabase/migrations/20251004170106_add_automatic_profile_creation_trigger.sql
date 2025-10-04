/*
  # Add Automatic Profile Creation on User Signup

  ## Problem
  When users sign up via auth, no corresponding row is created in the `profiles` table.
  This causes multiple issues:
  1. TDEE completion cannot be saved (profile not found error)
  2. Chat context cannot be tracked
  3. User data cannot be stored

  ## Solution
  Create a database trigger that automatically creates a profile row whenever
  a new user signs up in auth.users.

  ## Changes
  1. Create `handle_new_user()` function that creates a profile row
  2. Create trigger that fires on INSERT to auth.users
  3. Profile will be created with minimal required fields:
     - user_id (from auth.users.id)
     - email (from auth.users.email)
     - name (default: extracted from email or "User")
     - role (default: 'free_user')
  
  ## Security
  - Function uses SECURITY DEFINER to bypass RLS
  - Only creates profile if it doesn't already exist
  - Minimal data exposure (only email and derived name)
*/

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  -- Extract a default name from email (part before @)
  v_name := COALESCE(
    split_part(NEW.email, '@', 1),
    'User'
  );
  
  -- Create profile for new user
  INSERT INTO public.profiles (
    user_id,
    email,
    name,
    role,
    beta_user
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_name,
    'free_user',
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users who don't have profiles
INSERT INTO public.profiles (user_id, email, name, role, beta_user)
SELECT 
  au.id,
  au.email,
  COALESCE(split_part(au.email, '@', 1), 'User'),
  'free_user',
  false
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;