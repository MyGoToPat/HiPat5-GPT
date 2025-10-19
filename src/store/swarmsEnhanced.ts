import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swarm-admin-api`;

// Environment-driven write gate for defense-in-depth
const WRITE_ENABLED = import.meta.env.VITE_ADMIN_ENHANCED_WRITE_ENABLED === 'true';

// Security model: Client sends requests with user JWT + anon apikey.
// Edge Function (swarm-admin-api) uses service role key server-side.
// No service role key is exposed to the client.

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
  checksum: string | null;
}

interface SwarmAgent {
  swarm_id: string;
  agent_prompt_id: string;
  phase: 'pre' | 'core' | 'filter' | 'presenter' | 'post' | 'render';
  exec_order: number;
  enabled: boolean;
  agent_prompts?: AgentPrompt;
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
  agent_prompt_id: string | null;
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

interface SwarmsEnhancedState {
  swarms: Swarm[];
  agentPrompts: AgentPrompt[];
  swarmAgents: SwarmAgent[];
  swarmVersions: SwarmVersion[];
  testRuns: AgentTestRun[];
  dietaryRules: DietaryFilterRule[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchSwarms: () => Promise<void>;
  fetchAgentPrompts: (agentId?: string) => Promise<void>;
  fetchSwarmAgents: (swarmId?: string) => Promise<void>;
  fetchSwarmVersions: (swarmId?: string) => Promise<void>;
  fetchTestRuns: () => Promise<void>;
  fetchDietaryRules: () => Promise<void>;

  createSwarm: (swarm: Partial<Swarm>) => Promise<Swarm>;
  updateSwarm: (id: string, updates: Partial<Swarm>) => Promise<Swarm>;
  deleteSwarm: (id: string) => Promise<void>;

  createAgentPrompt: (prompt: Partial<AgentPrompt>) => Promise<AgentPrompt>;
  updateAgentPrompt: (id: string, updates: Partial<AgentPrompt>) => Promise<AgentPrompt>;
  deleteAgentPrompt: (id: string) => Promise<void>;
  publishAgentPrompt: (id: string) => Promise<AgentPrompt>;

  createSwarmAgent: (swarmAgent: Partial<SwarmAgent>) => Promise<SwarmAgent>;

  createSwarmVersion: (version: Partial<SwarmVersion>) => Promise<SwarmVersion>;
  updateSwarmVersion: (id: string, updates: Partial<SwarmVersion>) => Promise<SwarmVersion>;
  publishSwarmVersion: (id: string) => Promise<void>;

  createTestRun: (testRun: Partial<AgentTestRun>) => Promise<AgentTestRun>;

  healthCheck: () => Promise<{ status: string; canReadSwarms: boolean }>;
}

// Get auth headers with user JWT (not anon key) for Edge Function authentication
async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token || '';
  return {
    ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}

export const useSwarmsEnhancedStore = create<SwarmsEnhancedState>((set, get) => ({
  swarms: [],
  agentPrompts: [],
  swarmAgents: [],
  swarmVersions: [],
  testRuns: [],
  dietaryRules: [],
  loading: false,
  error: null,

  healthCheck: async () => {
    const res = await fetch(`${API_BASE}/health`, { headers: await getAuthHeaders() });
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  fetchSwarms: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/swarms`, { headers: await getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch swarms: ${res.statusText}`);
      const data = await res.json();
      set({ swarms: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchAgentPrompts: async (agentId?: string) => {
    set({ loading: true, error: null });
    try {
      const url = agentId ? `${API_BASE}/agent-prompts?agent_id=${agentId}` : `${API_BASE}/agent-prompts`;
      const res = await fetch(url, { headers: await getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch agent prompts: ${res.statusText}`);
      const data = await res.json();
      set({ agentPrompts: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchSwarmAgents: async (swarmId?: string) => {
    set({ loading: true, error: null });
    try {
      const url = swarmId ? `${API_BASE}/swarm-agents?swarm_id=${swarmId}` : `${API_BASE}/swarm-agents`;
      const res = await fetch(url, { headers: await getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch swarm agents: ${res.statusText}`);
      const data = await res.json();
      set({ swarmAgents: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchSwarmVersions: async (swarmId?: string) => {
    set({ loading: true, error: null });
    try {
      const url = swarmId ? `${API_BASE}/swarm-versions?swarm_id=${swarmId}` : `${API_BASE}/swarm-versions`;
      const res = await fetch(url, { headers: await getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch swarm versions: ${res.statusText}`);
      const data = await res.json();
      set({ swarmVersions: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchTestRuns: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/agent-test-runs`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch test runs: ${res.statusText}`);
      const data = await res.json();
      set({ testRuns: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchDietaryRules: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/dietary-filter-rules`, { headers: getHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch dietary rules: ${res.statusText}`);
      const data = await res.json();
      set({ dietaryRules: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createSwarm: async (swarm) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/swarms`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(swarm),
    });
    if (!res.ok) throw new Error(`Failed to create swarm: ${res.statusText}`);
    const data = await res.json();
    set({ swarms: [...get().swarms, data] });
    return data;
  },

  updateSwarm: async (id, updates) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/swarms/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update swarm: ${res.statusText}`);
    const data = await res.json();
    set({ swarms: get().swarms.map(s => s.id === id ? data : s) });
    return data;
  },

  deleteSwarm: async (id) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/swarms/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to delete swarm: ${res.statusText}`);
    set({ swarms: get().swarms.filter(s => s.id !== id) });
  },

  createAgentPrompt: async (prompt) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/agent-prompts`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(prompt),
    });
    if (!res.ok) throw new Error(`Failed to create agent prompt: ${res.statusText}`);
    const data = await res.json();
    set({ agentPrompts: [...get().agentPrompts, data] });
    return data;
  },

  updateAgentPrompt: async (id, updates) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/agent-prompts/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update agent prompt: ${res.statusText}`);
    const data = await res.json();
    set({ agentPrompts: get().agentPrompts.map(p => p.id === id ? data : p) });
    return data;
  },

  deleteAgentPrompt: async (id) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/agent-prompts/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to delete agent prompt: ${res.statusText}`);
    set({ agentPrompts: get().agentPrompts.filter(p => p.id !== id) });
  },

  publishAgentPrompt: async (id) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/agent-prompts/${id}/publish`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to publish agent prompt: ${res.statusText}`);
    const data = await res.json();
    set({ agentPrompts: get().agentPrompts.map(p => p.id === id ? data : p) });
    return data;
  },

  createSwarmAgent: async (swarmAgent) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/swarm-agents`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(swarmAgent),
    });
    if (!res.ok) throw new Error(`Failed to create swarm agent: ${res.statusText}`);
    const data = await res.json();
    set({ swarmAgents: [...get().swarmAgents, data] });
    return data;
  },

  createSwarmVersion: async (version) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/swarm-versions`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ ...version, rollout_percent: 0 }),
    });
    if (!res.ok) throw new Error(`Failed to create swarm version: ${res.statusText}`);
    const data = await res.json();
    set({ swarmVersions: [...get().swarmVersions, data] });
    return data;
  },

  updateSwarmVersion: async (id, updates) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/swarm-versions/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Failed to update swarm version: ${res.statusText}`);
    const data = await res.json();
    set({ swarmVersions: get().swarmVersions.map(v => v.id === id ? data : v) });
    return data;
  },

  publishSwarmVersion: async (id) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/swarm-versions/${id}/publish`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to publish swarm version: ${res.statusText}`);
    await get().fetchSwarmVersions();
  },

  createTestRun: async (testRun) => {
    if (!WRITE_ENABLED) {
      if (import.meta.env.DEV) {
        console.debug('[swarmsEnhanced] Write blocked in read-only mode');
      }
      throw new Error('Writes disabled in this environment');
    }
    const res = await fetch(`${API_BASE}/agent-test-runs`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(testRun),
    });
    if (!res.ok) throw new Error(`Failed to create test run: ${res.statusText}`);
    const data = await res.json();
    set({ testRuns: [data, ...get().testRuns] });
    return data;
  },
}));
