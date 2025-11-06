/**
 * PERSONALITY PROMPT LOADER - DB ONLY
 * Loads Pat's voice-first personality prompts from database
 *
 * Storage: personality_prompts table
 * No routing logic - pure personality/voice mechanics
 * DB is the single source of truth
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
 * Canonical DB loader for personality prompts
 * @param supabase - Authenticated Supabase client (RLS applies)
 * @param agent - Agent identifier (default: 'pat')
 * @returns Array of prompt blocks sorted by phase then order
 */
export async function loadPersonalityFromDB(
  supabase: SupabaseClient,
  agent = 'pat'
): Promise<PromptBlock[]> {
  const { data, error } = await supabase
    .from('personality_prompts')
    .select('content, prompt_key, phase, "order"')
    .eq('agent', agent)
    .eq('enabled', true)
    .order('phase', { ascending: true })
    .order('"order"', { ascending: true });

  if (error) {
    console.error('[personality-loader] Database error:', error);
    throw new Error(`Failed to load personality prompts: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(`No enabled personality prompts found for agent="${agent}"`);
  }

  // Guard: expect exactly 11 prompts for 'pat'
  if (agent === 'pat' && data.length < 11) {
    throw new Error(`personality_prompts: expected 11, got ${data.length}`);
  }

  console.info('[personality-loader] Loaded from DB (', data.length, ' prompts)');

  // Return blocks in DB order (already sorted by phase then order)
  return data.map(row => ({
    prompt_key: row.prompt_key,
    phase: row.phase as PromptPhase,
    order: row["order"],
    content: row.content
  }));
}

/**
 * LEGACY: Keep for backward compatibility, but redirect to DB loader
 * @deprecated Use loadPersonalityFromDB instead
 */
export async function loadPersonalityPrompts(
  supabase: SupabaseClient,
  agent = 'pat',
  dev = false
): Promise<PromptBlock[]> {
  console.warn('[personality-loader] loadPersonalityPrompts is deprecated, use loadPersonalityFromDB');
  return loadPersonalityFromDB(supabase, agent);
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

