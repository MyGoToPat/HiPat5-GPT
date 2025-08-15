import { create } from 'zustand';
import { getActiveOrgIdSafe, listOrganizationsSafe, setActiveOrgSafe } from '../lib/org';

export interface Org { 
  id: string; 
  name: string; 
  owner_id: string; 
}

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
  error: string | null;
  fetchMyOrgs: () => Promise<void>;
  setActiveOrg: (orgId: string) => Promise<void>;
  getActiveOrgId: () => string | null;
  init: () => Promise<void>;
};

export const useOrgStore = create<OrgState>((set, get) => ({
  orgs: [],
  currentOrgId: null,
  loading: false,
  error: null,

  // One-shot bootstrap: load org list, set active from server, or fall back to first org
  init: async () => {
    await get().fetchMyOrgs();

    const activeOrgId = await getActiveOrgIdSafe();
    if (activeOrgId) {
      set({ currentOrgId: activeOrgId });
      return;
    }

    const first = get().orgs[0];
    if (first) {
      await get().setActiveOrg(first.id);
    }
  },

  fetchMyOrgs: async () => {
    set({ loading: true, error: null });
    try {
      const orgs = await listOrganizationsSafe();
      set({ orgs, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  setActiveOrg: async (orgId) => {
    const success = await setActiveOrgSafe(orgId);
    if (success) {
      set({ currentOrgId: orgId });
    }
  },

  getActiveOrgId: () => get().currentOrgId,
}));