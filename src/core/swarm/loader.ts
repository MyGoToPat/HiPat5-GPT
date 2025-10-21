/**
 * SWARM LOADER SYSTEM
 * Loads agent configs from database and builds dynamic system prompts
 */

export interface AgentConfig {
  id: string;
  name: string;
  enabled: boolean;
  phase: 'pre' | 'main' | 'post';
  order: number;
  model: string;
  promptRef?: string;
  rulesRef?: string;
  prompt?: string; // Direct prompt override
  io: {
    in: string;
    out: string;
  };
}

export interface SwarmConfig {
  swarm_name: string;
  agents: AgentConfig[];
}

/**
 * Load swarm configuration from database
 */
export async function loadSwarmFromDB(swarmName: string): Promise<SwarmConfig | null> {
  const { getSupabase } = await import('../../lib/supabase');
  const supabase = getSupabase();

  const { data } = await supabase
    .from('agent_configs')
    .select('config')
    .eq('agent_key', swarmName)
    .maybeSingle();

  if (!data?.config) {
    console.log(`[swarm-loader] No DB config found for ${swarmName}, trying filesystem`);
    return null;
  }

  return data.config as SwarmConfig;
}

/**
 * Load swarm from JSON file (fallback)
 */
export async function loadSwarmFromFile(swarmName: string): Promise<SwarmConfig | null> {
  try {
    const module = await import(`../../config/swarms/${swarmName}.json`);
    const agents = module.default || module;

    return {
      swarm_name: swarmName,
      agents
    };
  } catch (err) {
    console.error(`[swarm-loader] Failed to load ${swarmName}.json:`, err);
    return null;
  }
}

/**
 * Load swarm config (tries DB first, falls back to file)
 */
export async function loadSwarm(swarmName: string): Promise<SwarmConfig | null> {
  // Try database first
  const dbConfig = await loadSwarmFromDB(swarmName);
  if (dbConfig) {
    console.log(`[swarm-loader] Loaded ${swarmName} from database`);
    return dbConfig;
  }

  // Fallback to filesystem
  const fileConfig = await loadSwarmFromFile(swarmName);
  if (fileConfig) {
    console.log(`[swarm-loader] Loaded ${swarmName} from filesystem`);
    return fileConfig;
  }

  console.error(`[swarm-loader] Failed to load swarm: ${swarmName}`);
  return null;
}

/**
 * Build system prompt from swarm agents
 * Combines all enabled pre-phase and main agents' prompts
 */
export function buildSwarmPrompt(swarm: SwarmConfig, userContext?: Record<string, any>): string {
  const sections: string[] = [];

  // Get all enabled agents sorted by phase and order
  const enabledAgents = swarm.agents
    .filter(a => a.enabled)
    .sort((a, b) => {
      const phaseOrder = { 'pre': 0, 'main': 1, 'post': 2 };
      const phaseDiff = phaseOrder[a.phase] - phaseOrder[b.phase];
      return phaseDiff !== 0 ? phaseDiff : a.order - b.order;
    });

  // Only include pre and main phases in system prompt
  // (post agents run after LLM response)
  const promptAgents = enabledAgents.filter(a => a.phase === 'pre' || a.phase === 'main');

  for (const agent of promptAgents) {
    if (agent.prompt) {
      // Direct prompt
      sections.push(`[${agent.name}]`);
      sections.push(agent.prompt);
    } else if (agent.promptRef) {
      // Reference to prompt library
      const prompt = resolvePromptRef(agent.promptRef);
      if (prompt) {
        sections.push(`[${agent.name}]`);
        sections.push(prompt);
      }
    }
  }

  // Inject user context at the end
  if (userContext && Object.keys(userContext).length > 0) {
    sections.push('');
    sections.push('=== USER CONTEXT (USE THIS TO PERSONALIZE YOUR RESPONSES) ===');
    for (const [key, value] of Object.entries(userContext)) {
      if (value !== undefined && value !== null) {
        sections.push(`${key}: ${JSON.stringify(value)}`);
      }
    }
  }

  return sections.join('\n\n');
}

/**
 * Resolve prompt reference to actual prompt text
 */
function resolvePromptRef(promptRef: string): string | null {
  const { resolvePromptRef: resolve } = require('./prompts');
  return resolve(promptRef);
}

/**
 * Get swarm for a given intent/role
 */
export async function getSwarmForIntent(intent: string): Promise<SwarmConfig | null> {
  const intentToSwarm: Record<string, string> = {
    'food_question': 'macro',
    'food_mention': 'tmwya',
    'food_log': 'tmwya',
    'food_undo': 'tmwya',
    'kpi_today': 'macro',
    'kpi_remaining': 'macro',
    'general': 'persona', // General chat uses persona swarm
  };

  const swarmName = intentToSwarm[intent];
  if (!swarmName) {
    console.warn(`[swarm-loader] No swarm mapped for intent: ${intent}`);
    return null;
  }

  return await loadSwarm(swarmName);
}
