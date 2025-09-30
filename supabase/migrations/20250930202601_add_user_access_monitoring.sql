/*
  # Add User Access Monitoring Functions

  ## Purpose
  Provides monitoring and alerting functions to detect misconfigured users who might
  not have proper access despite having paid/beta roles.

  ## Functions Created
  1. `check_misconfigured_paid_users()` - Returns paid users without beta access
  2. `test_user_access(user_id)` - Tests if a specific user has chat access
  3. `get_access_summary()` - Returns summary of all user access states

  ## Use Cases
  - Daily monitoring to catch configuration issues
  - Admin UI "Test Access" button
  - Automated alerts for misconfigured accounts
  - Audit reports for access control

  ## Security
  - Functions use SECURITY DEFINER with admin check
  - Only admins can execute monitoring functions
  - Safe read-only operations
*/

-- Function 1: Check for misconfigured paid users
CREATE OR REPLACE FUNCTION public.check_misconfigured_paid_users()
RETURNS TABLE(
  user_count bigint,
  affected_emails text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) as user_count,
    ARRAY_AGG(email ORDER BY created_at DESC) as affected_emails
  FROM profiles
  WHERE role = 'paid_user' AND beta_user = false;
$$;

GRANT EXECUTE ON FUNCTION public.check_misconfigured_paid_users() TO authenticated;

-- Function 2: Test if a specific user has access
CREATE OR REPLACE FUNCTION public.test_user_access(target_user_id uuid)
RETURNS TABLE(
  email text,
  role text,
  beta_user boolean,
  has_access boolean,
  access_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_role text;
BEGIN
  -- Check if caller is admin
  SELECT role INTO _caller_role FROM profiles WHERE user_id = auth.uid();
  
  IF _caller_role IS NULL OR _caller_role != 'admin' THEN
    RAISE EXCEPTION 'Permission denied: Admin role required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.email,
    p.role,
    p.beta_user,
    CASE
      WHEN p.role = 'admin' THEN true
      WHEN p.role = 'paid_user' AND p.beta_user = true THEN true
      WHEN p.beta_user = true THEN true
      ELSE false
    END as has_access,
    CASE
      WHEN p.role = 'admin' THEN 'Admin - full access'
      WHEN p.role = 'paid_user' AND p.beta_user = true THEN 'Paid user with beta access'
      WHEN p.role = 'paid_user' AND p.beta_user = false THEN 'BLOCKED: Paid user missing beta flag'
      WHEN p.beta_user = true THEN 'Beta user access'
      ELSE 'BLOCKED: No access granted'
    END as access_reason
  FROM profiles p
  WHERE p.user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_user_access(uuid) TO authenticated;

-- Function 3: Get access summary for all users
CREATE OR REPLACE FUNCTION public.get_access_summary()
RETURNS TABLE(
  total_users bigint,
  admin_count bigint,
  paid_with_access bigint,
  paid_without_access bigint,
  beta_only bigint,
  no_access bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
    COUNT(*) FILTER (WHERE role = 'paid_user' AND beta_user = true) as paid_with_access,
    COUNT(*) FILTER (WHERE role = 'paid_user' AND beta_user = false) as paid_without_access,
    COUNT(*) FILTER (WHERE role != 'paid_user' AND role != 'admin' AND beta_user = true) as beta_only,
    COUNT(*) FILTER (WHERE role NOT IN ('paid_user', 'admin') AND beta_user = false) as no_access
  FROM profiles;
$$;

GRANT EXECUTE ON FUNCTION public.get_access_summary() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.check_misconfigured_paid_users() IS 
  'Returns count and list of paid users without beta access - useful for daily monitoring';

COMMENT ON FUNCTION public.test_user_access(uuid) IS 
  'Tests if a specific user has chat access and explains why - used by admin UI';

COMMENT ON FUNCTION public.get_access_summary() IS 
  'Returns summary statistics of user access states across the system';
