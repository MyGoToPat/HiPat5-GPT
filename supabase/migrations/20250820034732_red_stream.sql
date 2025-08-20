-- helpers
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select exists(
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- enable RLS
alter table public.org_members enable row level security;
alter table public.organizations enable row level security;

-- drop existing policies (loop-safe)
do $$
declare p record;
begin
  for p in select policyname from pg_policies
   where schemaname='public' and tablename='org_members'
  loop execute format('drop policy if exists %I on public.org_members', p.policyname); end loop;
end$$;

-- org_members policies (non-recursive)
create policy org_members_sel_self_or_admin on public.org_members
for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy org_members_ins_admin on public.org_members
for insert to authenticated with check (public.is_admin());

create policy org_members_upd_admin on public.org_members
for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy org_members_del_admin on public.org_members
for delete to authenticated using (public.is_admin());

-- drop existing org policies
do $$
declare p record;
begin
  for p in select policyname from pg_policies
   where schemaname='public' and tablename='organizations'
  loop execute format('drop policy if exists %I on public.organizations', p.policyname); end loop;
end$$;

-- organizations policies
create policy organizations_sel_owner_or_member_or_admin on public.organizations
for select to authenticated
using (
  owner_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.org_members m
    where m.org_id = public.organizations.id
      and m.user_id = auth.uid()
  )
);

create policy organizations_ins_admin on public.organizations
for insert to authenticated with check (public.is_admin());

create policy organizations_upd_owner_or_admin on public.organizations
for update to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy organizations_del_owner_or_admin on public.organizations
for delete to authenticated using (owner_id = auth.uid() or public.is_admin());