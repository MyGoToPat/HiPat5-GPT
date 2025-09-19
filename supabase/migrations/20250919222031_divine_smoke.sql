/*
  # Add has_app_access function for route protection

  1. New Functions
    - `has_app_access(uuid)` - Security definer function that checks if a user has app access
      - Returns true if user has role = 'admin' OR beta_user = true
      - Returns false otherwise or if user not found

  2. Security
    - Function is security definer to bypass RLS while evaluating access
    - Grants execute permission to authenticated and anon roles
    - Uses safe search_path = public

  3. Purpose
    - Supports frontend ProtectedRoute component for access control
    - Provides consistent access logic across application
    - Enables proper beta/admin gating for app features
*/

-- Replace the helper to bypass RLS while evaluating access
drop function if exists public.has_app_access(uuid);

create or replace function public.has_app_access(uid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  res boolean;
begin
  select (p.role = 'admin' or p.beta_user)
    into res
  from public.profiles p
  where p.id = uid;

  return coalesce(res, false);
end;
$$;

-- Allow your app roles to call it
grant execute on function public.has_app_access(uuid) to authenticated, anon;