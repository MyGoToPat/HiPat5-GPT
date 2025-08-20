alter table public.org_members enable row level security;
alter table public.organizations enable row level security;

drop policy if exists org_members_sel_self_or_admin on public.org_members;
drop policy if exists org_members_ins_admin        on public.org_members;
drop policy if exists org_members_upd_admin        on public.org_members;
drop policy if exists org_members_del_admin        on public.org_members;

create policy org_members_all_admin on public.org_members
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists organizations_sel_owner_or_member_or_admin on public.organizations;
drop policy if exists organizations_ins_admin                    on public.organizations;
drop policy if exists organizations_upd_owner_or_admin           on public.organizations;
drop policy if exists organizations_del_owner_or_admin           on public.organizations;

create policy organizations_all_admin on public.organizations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());