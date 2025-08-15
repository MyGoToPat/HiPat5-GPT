import { create } from 'zustand';
import { getActiveOrgIdSafe, setActiveOrgSafe, listOrganizationsSafe, type Org } from '../lib/org';

export interface OrgMember { 
  org_id: string; 
  user_id: string; 
  role: 'owner'|'admin'|'member'; 
  status: 'active'|'invited'|'inactive'; 
}

type OrgState = {
  orgs: Org[];
  currentOrgId: string | null;
  loading: boolean;
  error?: string | null;
  init: () => Promise<void>;
  fetchMyOrgs: () => Promise<void>;
  setActiveOrg: (id: string) => Promise<void>;
  getActiveOrgId: () => string | null;
};

export const useOrgStore = create<OrgState>((set, get) => ({
  orgs: [],
  currentOrgId: null,
  loading: false,
  error: null,

  init: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });

    const [active, list] = await Promise.all([
      getActiveOrgIdSafe(),
      listOrganizationsSafe(),
    ]);

    let current = active ?? (list[0]?.id ?? null);
    if (!active && current) await setActiveOrgSafe(current);

    set({ orgs: list, currentOrgId: current, loading: false });
  },

  fetchMyOrgs: async () => {
    set({ loading: true, error: null });
    const list = await listOrganizationsSafe();
    set({ orgs: list, loading: false });
  },

  setActiveOrg: async (id: string) => {
    const ok = await setActiveOrgSafe(id);
    if (ok) set({ currentOrgId: id });
  },

  getActiveOrgId: () => get().currentOrgId,
}));