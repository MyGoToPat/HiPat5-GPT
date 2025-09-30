/*
  # Fix update_user_privileges - Add Admin Authorization Check

  ## Problem
  The `update_user_privileges` RPC function was missing admin authorization checks,
  allowing any authenticated user to modify user roles and beta access.

  ## Solution
  Add explicit admin role verification at the start of the function to ensure only
  admins can modify user privileges.

  ## Changes
  1. Add admin role check using the profiles table
  2. Raise exception if caller is not admin
  3. Preserve existing role validation logic

  ## Security
  - Only users with role='admin' in profiles table can execute privilege changes
  - SECURITY DEFINER is maintained for ability to update other users' profiles
  - Function validates both caller authorization AND target role validity
*/

CREATE OR REPLACE FUNCTION public.update_user_privileges(
  target_user_id uuid, 
  new_role text, 
  is_beta_user boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  _allowed_roles constant text[] := array['admin','trainer','user','free_user','paid_user'];
  _old_role text;
  _caller_role text;
begin
  -- CRITICAL: Check if caller is admin
  SELECT role INTO _caller_role
  FROM profiles
  WHERE user_id = auth.uid();
  
  IF _caller_role IS NULL OR _caller_role != 'admin' THEN
    RAISE EXCEPTION 'Permission denied: Admin role required to update user privileges'
      USING ERRCODE = '42501';
  END IF;

  -- Validate target role
  if new_role is null or not (new_role = any (_allowed_roles)) then
    raise exception 'Invalid role: % (allowed: %)', new_role, _allowed_roles 
      using errcode = '22023';
  end if;

  -- Capture old role (for history)
  select role into _old_role
  from profiles
  where user_id = target_user_id
  for update;

  -- Update profile (role + separate beta flag)
  update profiles
  set role = new_role,
      beta_user = is_beta_user,
      updated_at = now()
  where user_id = target_user_id;

  -- Write to role change history only if role changed
  if _old_role is distinct from new_role then
    insert into role_change_history (id, user_id, old_role, new_role, changed_by, changed_at)
    values (
      gen_random_uuid(),
      target_user_id,
      _old_role,
      new_role,
      auth.uid(),
      now()
    );
  end if;
end;
$$;

-- Maintain existing grants (function now has internal auth check)
GRANT EXECUTE ON FUNCTION public.update_user_privileges(uuid, text, boolean) TO authenticated;
