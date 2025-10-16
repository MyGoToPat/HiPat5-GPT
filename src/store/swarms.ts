import { create } from 'zustand';
import { getSupabase } from '../lib/supabase';

interface Swarm {
  id: string;
  name: string;
  description: string | null;
  default_model: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentPrompt {
  id: string;
  agent_id: string;
  title: string;
  content: string;
  model: string;
  phase: 'pre' | 'core' | 'filter' | 'presenter' | 'post' | 'render';
  exec_order: number;
  status: 'draft' | 'published';
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  checksum: string;
}

interface SwarmAgent {
  swarm_id: string;
  agent_prompt_id: string;
  phase: 'pre' | 'core' | 'filter' | 'presenter' | 'post' | 'render';
  exec_order: number;
  enabled: boolean;
}

interface SwarmVersion {
  id: string;
  swarm_id: string;
  status: 'draft' | 'published' | 'archived';
  rollout_percent: number;
  manifest: Record<string, any>;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
}

interface AgentTestRun {
  id: string;
  agent_prompt_id: string;
  input: Record<string, any>;
  output: Record<string, any> | null;
  model: string | null;
  token_usage: Record<string, any> | null;
  latency_ms: number | null;
  created_at: string;
  created_by: string | null;
  notes: string | null;
}

interface DietaryFilterRule {
  id: string;
  type: string;
  condition: Record<string, any>;
  annotations: any[];
  substitutions: any[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface SwarmsState {
  swarms: Swarm[];
  agentPrompts: AgentPrompt[];
  swarmAgents: SwarmAgent[];
  swarmVersions: SwarmVersion[];
  testRuns: AgentTestRun[];
  dietaryRules: DietaryFilterRule[];
  loading: boolean;
  error: string | null;

  fetchSwarms: () => Promise<void>;
  fetchAgentPrompts: (agentId?: string) => Promise<void>;
  fetchSwarmAgents: (swarmId: string) => Promise<void>;
  fetchSwarmVersions: (swarmId: string) => Promise<void>;
  fetchDietaryRules: () => Promise<void>;

  createSwarm: (swarm: Partial<Swarm>) => Promise<Swarm | null>;
  createAgentPrompt: (prompt: Partial<AgentPrompt>) => Promise<AgentPrompt | null>;
  updateAgentPrompt: (id: string, updates: Partial<AgentPrompt>) => Promise<void>;
  publishAgentPrompt: (id: string) => Promise<void>;

  createSwarmVersion: (version: Partial<SwarmVersion>) => Promise<SwarmVersion | null>;
  publishSwarmVersion: (versionId: string) => Promise<void>;
  updateRolloutPercent: (versionId: string, percent: number) => Promise<void>;

  createTestRun: (testRun: Partial<AgentTestRun>) => Promise<AgentTestRun | null>;

  getActiveManifest: (swarmId: string) => Promise<Record<string, any> | null>;

  getAgentPromptById: (id: string) => AgentPrompt | undefined;
  getSwarmById: (id: string) => Swarm | undefined;
}

export const useSwarmsStore = create<SwarmsState>((set, get) => ({
  swarms: [],
  agentPrompts: [],
  swarmAgents: [],
  swarmVersions: [],
  testRuns: [],
  dietaryRules: [],
  loading: false,
  error: null,

  fetchSwarms: async () => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('swarms')
        .select('*')
        .order('name');

      if (error) throw error;
      set({ swarms: data || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchAgentPrompts: async (agentId?: string) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      let query = supabase.from('agent_prompts').select('*');

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query.order('phase').order('exec_order');

      if (error) throw error;
      set({ agentPrompts: data || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchSwarmAgents: async (swarmId: string) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('swarm_agents')
        .select('*')
        .eq('swarm_id', swarmId)
        .order('phase')
        .order('exec_order');

      if (error) throw error;
      set({ swarmAgents: data || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchSwarmVersions: async (swarmId: string) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('swarm_versions')
        .select('*')
        .eq('swarm_id', swarmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ swarmVersions: data || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchDietaryRules: async () => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('dietary_filter_rules')
        .select('*')
        .eq('enabled', true);

      if (error) throw error;
      set({ dietaryRules: data || [], loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createSwarm: async (swarm: Partial<Swarm>) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('swarms')
        .insert(swarm)
        .select()
        .single();

      if (error) throw error;
      set(state => ({ swarms: [...state.swarms, data], loading: false }));
      return data;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  createAgentPrompt: async (prompt: Partial<AgentPrompt>) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('agent_prompts')
        .insert({ ...prompt, status: 'draft' })
        .select()
        .single();

      if (error) throw error;
      set(state => ({ agentPrompts: [...state.agentPrompts, data], loading: false }));
      return data;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  updateAgentPrompt: async (id: string, updates: Partial<AgentPrompt>) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('agent_prompts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        agentPrompts: state.agentPrompts.map(p => p.id === id ? { ...p, ...updates } : p),
        loading: false
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  publishAgentPrompt: async (id: string) => {
    await get().updateAgentPrompt(id, { status: 'published' });
  },

  createSwarmVersion: async (version: Partial<SwarmVersion>) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('swarm_versions')
        .insert({ ...version, status: 'draft', rollout_percent: 0 })
        .select()
        .single();

      if (error) throw error;
      set(state => ({ swarmVersions: [data, ...state.swarmVersions], loading: false }));
      return data;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  publishSwarmVersion: async (versionId: string) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { error } = await supabase.rpc('publish_swarm_version', {
        p_version_id: versionId
      });

      if (error) throw error;

      const version = get().swarmVersions.find(v => v.id === versionId);
      if (version) {
        await get().fetchSwarmVersions(version.swarm_id);
      }

      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  updateRolloutPercent: async (versionId: string, percent: number) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('swarm_versions')
        .update({ rollout_percent: percent })
        .eq('id', versionId);

      if (error) throw error;

      set(state => ({
        swarmVersions: state.swarmVersions.map(v =>
          v.id === versionId ? { ...v, rollout_percent: percent } : v
        ),
        loading: false
      }));
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createTestRun: async (testRun: Partial<AgentTestRun>) => {
    set({ loading: true, error: null });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('agent_test_runs')
        .insert(testRun)
        .select()
        .single();

      if (error) throw error;
      set(state => ({ testRuns: [data, ...state.testRuns], loading: false }));
      return data;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  getActiveManifest: async (swarmId: string) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc('get_active_swarm_manifest', {
        p_swarm_id: swarmId
      });

      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Failed to get active manifest:', e);
      return null;
    }
  },

  getAgentPromptById: (id: string) => get().agentPrompts.find(p => p.id === id),
  getSwarmById: (id: string) => get().swarms.find(s => s.id === id),
}));
