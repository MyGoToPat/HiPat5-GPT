/**
 * PERSONALITY PROMPT LOADER
 * Loads Pat's voice-first personality prompts from database
 * 
 * Storage: personality_prompts table
 * No routing logic - pure personality/voice mechanics
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type PromptPhase = 'pre' | 'core' | 'post';

export interface PromptBlock {
  prompt_key: string;
  phase: PromptPhase;
  order: number;
  content: string;
}

/**
 * Load enabled personality prompts for an agent
 * @param supabase - Authenticated Supabase client (RLS applies)
 * @param agent - Agent identifier (default: 'pat')
 * @returns Array of prompt blocks sorted by phase then order
 */
export async function loadPersonalityPrompts(
  supabase: SupabaseClient,
  agent = 'pat',
  dev = false
): Promise<PromptBlock[]> {
  // Fetch all enabled prompts - NO .order() calls, client-side sort is single source of truth
  const { data, error } = await supabase
    .from('personality_prompts')
    .select('content, prompt_key, phase, "order"')
    .eq('agent', agent)
    .eq('enabled', true);

  if (error) {
    console.error('[promptLoader] Database error:', error);
    throw new Error(`Failed to load personality prompts: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No enabled personality prompts found for agent="${agent}"`);
  }

  if (dev) {
    console.info('[pat-loader] count=', data.length);
  }

  // Guard: expect exactly 11 prompts for 'pat'
  if (agent === 'pat' && data.length < 11) {
    throw new Error(`personality_prompts: expected 11, got ${data.length}`);
  }

  // Client-side sort: CASE phase WHEN 'pre' THEN 1 WHEN 'core' THEN 2 ELSE 3, then by order
  const phaseValue = (p: string) => p === 'pre' ? 1 : p === 'core' ? 2 : 3;
  const sorted = data.sort((a, b) => {
    const phaseDiff = phaseValue(a.phase) - phaseValue(b.phase);
    return phaseDiff !== 0 ? phaseDiff : a.order - b.order;
  });

  // Return blocks in correct order
  return sorted.map(row => ({
    prompt_key: row.prompt_key,
    phase: row.phase as PromptPhase,
    order: row.order,
    content: row.content
  }));
}

/**
 * Get a specific prompt by key
 */
export function getPrompt(blocks: PromptBlock[], key: string): PromptBlock | null {
  return blocks.find(b => b.prompt_key === key) || null;
}

/**
 * Get all prompts for a specific phase
 */
export function getPhasePrompts(blocks: PromptBlock[], phase: PromptPhase): PromptBlock[] {
  return blocks.filter(b => b.phase === phase);
}

