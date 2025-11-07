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
 * @returns Array of prompt blocks sorted by phase then order
 */
export async function loadPersonalityFromDB(supabase: SupabaseClient): Promise<PromptBlock[]> {
  const { data, error } = await supabase
    .from('personality_prompts')
    .select('prompt_key, phase, "order", enabled, content')
    .eq('agent', 'pat')
    .order('phase', { ascending: true })
    .order('"order"', { ascending: true });

  if (error) {
    console.error('[personality-loader] Database error:', error);
    throw new Error(`Failed to load personality prompts: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No personality prompts found');
  }

  console.info('[personality-loader] Loaded from DB (' + data.length + ' prompts)');

  // Return blocks in DB order (already sorted by phase then order)
  return data.map(row => ({
    prompt_key: row.prompt_key,
    phase: row.phase as PromptPhase,
    order: row["order"],
    content: row.content
  }));
}

