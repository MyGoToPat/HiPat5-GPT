/**
 * POST-AGENT EXECUTOR FOR EDGE FUNCTIONS
 * Executes post-phase agents to refine LLM responses
 * Supports combined (single pass) and sequential (multiple passes) modes
 */

import type { SwarmConfig, AgentConfig } from './swarm-loader.ts';
import { resolvePromptRef } from './swarm-loader.ts';

export type ExecutionMode = 'combined' | 'sequential' | 'off';

/**
 * Execute post-phase agents on a draft response
 * @param draft - Initial LLM response to refine
 * @param swarm - Swarm configuration with agents
 * @param supabaseUrl - Supabase URL
 * @param supabaseKey - Supabase key
 * @param openaiApiKey - OpenAI API key for refinement calls
 * @param mode - Execution mode (combined, sequential, off)
 * @returns Refined response text
 */
export async function executePostAgents(
  draft: string,
  swarm: SwarmConfig,
  supabaseUrl: string,
  supabaseKey: string,
  openaiApiKey: string,
  mode: ExecutionMode = 'combined'
): Promise<string> {
  if (mode === 'off') {
    console.log('[post-executor] Mode is OFF, returning draft unchanged');
    return draft;
  }

  const postAgents = (swarm.agents || [])
    .filter(a => a.enabled && a.phase === 'post')
    .sort((a, b) => a.order - b.order);

  if (postAgents.length === 0) {
    console.log('[post-executor] No post agents found, returning draft unchanged');
    return draft;
  }

  console.log(`[post-executor] Executing ${postAgents.length} post agents in ${mode} mode`);

  if (mode === 'combined') {
    return await executeCombinedPass(draft, postAgents, supabaseUrl, supabaseKey, openaiApiKey);
  } else {
    return await executeSequentialPass(draft, postAgents, supabaseUrl, supabaseKey, openaiApiKey);
  }
}

/**
 * Combined mode: Single LLM call with all post agents as one meta-prompt
 */
async function executeCombinedPass(
  draft: string,
  postAgents: AgentConfig[],
  supabaseUrl: string,
  supabaseKey: string,
  openaiApiKey: string
): Promise<string> {
  // Build role cards for each post agent
  const roleCards: string[] = [];

  for (const agent of postAgents) {
    const prompt = await resolvePromptRef(agent.promptRef!, supabaseUrl, supabaseKey);
    if (prompt) {
      roleCards.push(`### ${agent.name}\n${prompt}\n`);
    }
  }

  const combinedPostPrompt = [
    `You are the Personality Swarm post-governor.`,
    `Apply the following post agents to the DRAFT, in order, without adding new facts.`,
    ``,
    ...roleCards,
    ``,
    `Return ONLY the final, revised message.`,
    ``,
    `DRAFT:`,
    `"""`,
    draft,
    `"""`,
    ``,
    `Final message:`
  ].join('\n');

  try {
    const refined = await callLLMForPost(combinedPostPrompt, openaiApiKey);
    console.log(`[post-executor] Combined pass complete, length: ${refined.length}`);
    return refined;
  } catch (error) {
    console.error('[post-executor] Combined pass failed:', error);
    return draft; // Fallback to original draft
  }
}

/**
 * Sequential mode: Multiple LLM calls, one per agent
 */
async function executeSequentialPass(
  draft: string,
  postAgents: AgentConfig[],
  supabaseUrl: string,
  supabaseKey: string,
  openaiApiKey: string
): Promise<string> {
  let refined = draft;

  for (const agent of postAgents) {
    const prompt = await resolvePromptRef(agent.promptRef!, supabaseUrl, supabaseKey);
    if (!prompt) {
      console.warn(`[post-executor] Skipping ${agent.name}, no prompt found`);
      continue;
    }

    const agentPrompt = [
      `Agent: ${agent.name}`,
      ``,
      `Apply the following post rule-set to the DRAFT. No new facts.`,
      ``,
      prompt,
      ``,
      `DRAFT:`,
      `"""`,
      refined,
      `"""`,
      ``,
      `Final message only:`
    ].join('\n');

    try {
      refined = await callLLMForPost(agentPrompt, openaiApiKey);
      console.log(`[post-executor] ${agent.name} complete, length: ${refined.length}`);
    } catch (error) {
      console.error(`[post-executor] ${agent.name} failed:`, error);
      // Continue with previous version on error
    }
  }

  return refined;
}

/**
 * Call LLM for post-processing
 * Uses gpt-4o-mini with lower temperature for faithful refinement
 */
async function callLLMForPost(systemPrompt: string, openaiApiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please apply the post-processing rules.' }
      ],
      max_tokens: 700,
      temperature: 0.4, // Lower temperature for faithful post-processing
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Post-processing LLM call failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message?.content;

  if (!message) {
    throw new Error('No message in post-processing response');
  }

  return message;
}
