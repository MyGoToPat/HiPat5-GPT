import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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

    const { data: activeOrgId, error: activeErr } = await supabase.rpc('get_active_org_id');
    if (!activeErr && activeOrgId) {
      set({ currentOrgId: activeOrgId as string });
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
      const { data, error } = await supabase
        .from('organizations')
        .select('id,name,owner_id'); // RLS will return only member orgs
      if (error) throw error;
      set({ orgs: data ?? [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  setActiveOrg: async (orgId) => {
    const { error } = await supabase.rpc('set_active_org', { p_org_id: orgId });
    if (error) throw error;
    set({ currentOrgId: orgId });
  },

  getActiveOrgId: () => get().currentOrgId,
}));