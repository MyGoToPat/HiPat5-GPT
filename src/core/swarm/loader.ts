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
 * Load swarm config (database only - no filesystem fallback)
 */
export async function loadSwarm(swarmName: string): Promise<SwarmConfig | null> {
  // Database is the single source of truth
  const dbConfig = await loadSwarmFromDB(swarmName);
  if (dbConfig) {
    console.log(`[swarm-loader] ✓ Loaded ${swarmName} from database`);
    return dbConfig;
  }

  // No fallback - if not in DB, it's an error
  console.error(`[swarm-loader] ✗ CRITICAL: Swarm "${swarmName}" not found in database. No filesystem fallback.`);
  console.error(`[swarm-loader] → Ensure agent_configs table has entry for "${swarmName}"`);
  return null;
}

/**
 * Build system prompt from swarm agents
 * Combines all enabled pre-phase and main agents' prompts
 */
export async function buildSwarmPrompt(swarm: SwarmConfig, userContext?: Record<string, any>): Promise<string> {
  const sections: string[] = [];

  // Import prompt library
  const { resolvePromptRef } = await import('./prompts');

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
      // Reference to prompt library (database-first, then fallback)
      const prompt = await resolvePromptRef(agent.promptRef);
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
