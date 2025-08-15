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
  getActiveOrgId: () => Promise<string | null>;
};

export const useOrgStore = create<OrgState>((set, get) => ({
  orgs: [],
  currentOrgId: null,
  loading: false,
  error: null,

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