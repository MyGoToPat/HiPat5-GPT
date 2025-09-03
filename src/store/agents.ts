import { create } from 'zustand';
import { getSupabase } from '../lib/supabase';
import { useOrgStore } from './org';

interface Agent {
  id: string;
  name: string;
  created_by: string;
  current_version_id: string | null;
  created_at: string;
}

interface AgentVersion {
  id: string;
  agent_id: string;
  config: Record<string, any>;
  version: number;
  created_at: string;
}

interface AgentsState {
  agents: Agent[];
  agentVersions: Record<string, AgentVersion[]>; // agentId -> versions
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchAgents: (isAdmin: boolean, userId: string) => Promise<void>;
  createAgent: (name: string, userId: string) => Promise<Agent | null>;
  fetchAgentVersions: (agentId: string) => Promise<void>;
  createAgentVersion: (agentId: string, config: Record<string, any>) => Promise<AgentVersion | null>;
  updateAgentCurrentVersion: (agentId: string, versionId: string) => Promise<void>;
  deleteAgentVersion: (versionId: string) => Promise<void>;
  
  // Selectors
  getAgentById: (id: string) => Agent | undefined;
  getAgentVersions: (agentId: string) => AgentVersion[];
  getCurrentAgentVersion: (agentId: string) => AgentVersion | undefined;
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],
  agentVersions: {},
  loading: false,
  error: null,

  fetchAgents: async (isAdmin, userId) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      let query = supabase.from('agents').select('*');
      if (!isAdmin) {
        const activeOrgId = useOrgStore.getState().getActiveOrgId();
        if (activeOrgId) {
          query = query.eq('org_id', activeOrgId);
        } else {
          query = query.eq('created_by', userId);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      set({ agents: data || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createAgent: async (name, userId) => {
    set({ loading: true, error: null });
    try {
      const activeOrgId = useOrgStore.getState().getActiveOrgId();
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('agents')
        .insert({ name, created_by: userId, org_id: activeOrgId })
        .select()
        .single();
      if (error) throw error;
      set(state => ({ agents: [...state.agents, data], loading: false }));
      return data;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  fetchAgentVersions: async (agentId) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('agent_versions')
        .select('*')
        .eq('agent_id', agentId)
        .order('version', { ascending: false });
      if (error) throw error;
      set(state => ({
        agentVersions: { ...state.agentVersions, [agentId]: data || [] },
        loading: false
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createAgentVersion: async (agentId, config) => {
    set({ loading: true, error: null });
    try {
      const activeOrgId = useOrgStore.getState().getActiveOrgId();
      const supabase = getSupabase();
      // Create new version
      const { data: newVersion, error: insertError } = await supabase
        .from('agent_versions')
        .insert({ agent_id: agentId, config, org_id: activeOrgId })
        .select()
        .single();
      if (insertError) throw insertError;

      // Update agent's current_version_id
      const { error: updateError } = await supabase
        .from('agents')
        .update({ current_version_id: newVersion.id })
        .eq('id', agentId);
      if (updateError) throw updateError;

      // Update local state
      set(state => {
        const existingVersions = state.agentVersions[agentId] || [];
        const newVersions = [newVersion, ...existingVersions].sort((a, b) => b.version - a.version);
        return {
          agentVersions: { ...state.agentVersions, [agentId]: newVersions },
          agents: state.agents.map(agent =>
            agent.id === agentId ? { ...agent, current_version_id: newVersion.id } : agent
          ),
          loading: false
        };
      });
      return newVersion;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  updateAgentCurrentVersion: async (agentId, versionId) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('agents')
        .update({ current_version_id: versionId })
        .eq('id', agentId);
      if (error) throw error;
      set(state => ({
        agents: state.agents.map(agent =>
          agent.id === agentId ? { ...agent, current_version_id: versionId } : agent
        ),
        loading: false
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  deleteAgentVersion: async (versionId) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('agent_versions')
        .delete()
        .eq('id', versionId);
      if (error) throw error;
      set(state => {
        const newAgentVersions = { ...state.agentVersions };
        for (const agentId in newAgentVersions) {
          newAgentVersions[agentId] = newAgentVersions[agentId].filter(v => v.id !== versionId);
        }
        return { agentVersions: newAgentVersions, loading: false };
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  // Selectors
  getAgentById: (id: string) => get().agents.find(agent => agent.id === id),
  getAgentVersions: (agentId: string) => get().agentVersions[agentId] || [],
  getCurrentAgentVersion: (agentId: string) => {
    const agent = get().getAgentById(agentId);
    if (!agent || !agent.current_version_id) return undefined;
    return get().agentVersions[agentId]?.find(v => v.id === agent.current_version_id);
  },
}));