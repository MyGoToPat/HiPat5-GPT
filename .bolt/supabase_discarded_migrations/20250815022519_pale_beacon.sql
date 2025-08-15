-- create or replace: get active org id used by RLS and the app
create or replace function public.get_active_org_id()
returns uuid
language plpgsql
security definer
stable
as $$
declare
  _org_id uuid;
begin
  -- First preference: profile.active_org_id if you added it, else profiles.org_id
  select p.org_id into _org_id
  from public.profiles p
  where p.user_id = auth.uid();

  if _org_id is null then
    -- fallback: first membership
    select om.org_id into _org_id
    from public.org_members om
    where om.user_id = auth.uid()
    order by om.joined_at asc
    limit 1;
  end if;

  return _org_id;
end;
$$;

-- set active org used by OrgSwitcher + store
create or replace function public.set_active_org(p_org_id uuid)
returns void
language plpgsql
security definer
stable
as $$
begin
  -- verify caller is member of the org
  if not exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Not a member of this organization';
  end if;

  -- persist on profile (org_id column)
  update public.profiles
     set org_id = p_org_id,
         updated_at = now()
   where user_id = auth.uid();
end;
$$;