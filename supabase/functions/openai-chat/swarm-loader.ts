/**
 * SWARM LOADER FOR EDGE FUNCTIONS (Deno-compatible)
 * Loads personality swarm configuration from database and builds dynamic system prompts
 *
 * CRITICAL: This replaces the single-prompt personality-loader.ts approach
 */

import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

export interface AgentConfig {
  id: string;
  name: string;
  enabled: boolean;
  phase: 'pre' | 'main' | 'post';
  order: number;
  promptRef?: string;
  prompt?: string; // Direct prompt override
}

export interface SwarmConfig {
  swarm_name: string;
  agents: AgentConfig[];
}

/**
 * Load swarm configuration from database
 * @param swarmName - Name of swarm to load (e.g., 'personality')
 * @param supabaseUrl - Supabase project URL
 * @param supabaseKey - Supabase service role key
 */
export async function loadSwarmFromDB(
  swarmName: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<SwarmConfig | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('agent_configs')
      .select('config')
      .eq('agent_key', swarmName)
      .maybeSingle();

    if (error) {
      console.error(`[swarm-loader] DB error loading ${swarmName}:`, error.message);
      return null;
    }

    if (!data?.config) {
      console.error(`[swarm-loader] No config found for swarm: ${swarmName}`);
      return null;
    }

    console.log(`[swarm-loader] ✓ Loaded swarm: ${swarmName}`);
    return data.config as SwarmConfig;
  } catch (err) {
    console.error(`[swarm-loader] Exception loading swarm ${swarmName}:`, err);
    return null;
  }
}

/**
 * Resolve a prompt reference to actual prompt text from database
 * @param promptRef - Agent ID to look up (e.g., 'PERSONALITY_VOICE')
 * @param supabaseUrl - Supabase project URL
 * @param supabaseKey - Supabase service role key
 */
export async function resolvePromptRef(
  promptRef: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string | null> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('agent_prompts')
      .select('content')
      .eq('agent_id', promptRef)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`[swarm-loader] DB error for promptRef ${promptRef}:`, error.message);
      return null;
    }

    if (!data?.content) {
      console.warn(`[swarm-loader] No published prompt found for: ${promptRef}`);
      return null;
    }

    console.log(`[swarm-loader] ✓ Loaded prompt: ${promptRef} (${data.content.length} chars)`);
    return data.content;
  } catch (err) {
    console.warn(`[swarm-loader] Exception loading prompt ${promptRef}:`, err);
    return null;
  }
}

/**
 * Build system prompt from swarm agents
 * Combines all enabled pre-phase and main-phase agents' prompts
 * Post-phase agents are NOT included (they run after LLM response)
 *
 * @param swarm - Swarm configuration
 * @param supabaseUrl - Supabase project URL
 * @param supabaseKey - Supabase service role key
 * @param userContext - Optional user context to inject
 */
export async function buildSwarmPrompt(
  swarm: SwarmConfig,
  supabaseUrl: string,
  supabaseKey: string,
  userContext?: Record<string, any>
): Promise<string> {
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
  // Post agents run after LLM response
  const promptAgents = enabledAgents.filter(a => a.phase === 'pre' || a.phase === 'main');

  console.log(`[swarm-loader] Building prompt with ${promptAgents.length} agents (${promptAgents.filter(a => a.phase === 'pre').length} pre, ${promptAgents.filter(a => a.phase === 'main').length} main)`);

  for (const agent of promptAgents) {
    if (agent.prompt) {
      // Direct prompt
      sections.push(`[${agent.name}]`);
      sections.push(agent.prompt);
    } else if (agent.promptRef) {
      // Reference to prompt library (database)
      const prompt = await resolvePromptRef(agent.promptRef, supabaseUrl, supabaseKey);
      if (prompt) {
        sections.push(`[${agent.name}]`);
        sections.push(prompt);
      } else {
        console.warn(`[swarm-loader] Skipping agent ${agent.name}, prompt not found`);
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

  const finalPrompt = sections.join('\n\n');
  console.log(`[swarm-loader] Built system prompt: ${finalPrompt.length} chars from ${promptAgents.length} agents`);

  return finalPrompt;
}

/**
 * Get post-phase agents for a swarm
 * These agents run AFTER the main LLM response to refine/polish output
 */
export function getPostAgents(swarm: SwarmConfig): AgentConfig[] {
  return swarm.agents
    .filter(a => a.enabled && a.phase === 'post')
    .sort((a, b) => a.order - b.order);
}
