import { AgentConfig } from '@/types/mcp';
import { defaultPersonalityAgents } from '@/config/personality/agentsRegistry';

type PersonalityState = {
  agents: Record<string, AgentConfig>;
  swarm: string[]; // ordered list of agent IDs
  version: number;
  useRouterV1: boolean; // Feature flag for new routing system
};

const KEY = "hipat.personality.v1";

const CURRENT_VERSION = 4; // Increment when agents change to force reload

const defaultState: PersonalityState = {
  agents: { ...defaultPersonalityAgents },
  swarm: Object.keys(defaultPersonalityAgents).sort(
    (a, b) => (defaultPersonalityAgents[a].order ?? 0) - (defaultPersonalityAgents[b].order ?? 0)
  ),
  version: CURRENT_VERSION,
  useRouterV1: true, // Default on; can be disabled programmatically
};

function load(): PersonalityState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const loaded = JSON.parse(raw);

      // Check version - if outdated, reset to defaults
      if (!loaded.version || loaded.version < CURRENT_VERSION) {
        console.log(`[PersonalityStore] Version mismatch (${loaded.version} < ${CURRENT_VERSION}). Resetting to defaults.`);
        localStorage.removeItem(KEY);
        return defaultState;
      }

      // Auto-enable router for Admin/Beta roles
      if (typeof window !== 'undefined') {
        const userRole = localStorage.getItem('hipat_user_role') || 'free_user';
        loaded.useRouterV1 = userRole === 'admin' || userRole === 'beta';
      }
      return loaded;
    }
  } catch {}
  return defaultState;
}

let state: PersonalityState = load();

function persist() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function getPersonalityAgents(): Record<string, AgentConfig> {
  return state.agents;
}

export function getPersonalitySwarm(): string[] {
  return state.swarm;
}

export function getRouterV1Enabled(): boolean {
  return state.useRouterV1;
}

export function setRouterV1Enabled(enabled: boolean) {
  state.useRouterV1 = enabled;
  persist();
}

export function upsertPersonalityAgent(cfg: AgentConfig) {
  state.agents[cfg.id] = cfg;
  if (!state.swarm.includes(cfg.id)) state.swarm.push(cfg.id);
  // keep swarm ordered by each agent.order
  state.swarm.sort((a, b) => (state.agents[a].order ?? 0) - (state.agents[b].order ?? 0));
  persist();
}

export function setPersonalitySwarm(agentIds: string[]) {
  state.swarm = agentIds.filter((id) => !!state.agents[id]);
  // normalize order to index+1
  state.swarm.forEach((id, i) => (state.agents[id].order = i + 1));
  persist();
}

export function resetPersonalityState() {
  state = JSON.parse(JSON.stringify(defaultState));
  persist();
}