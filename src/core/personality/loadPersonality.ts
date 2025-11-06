/**
 * CANONICAL PERSONALITY LOADER
 * DB-only personality loading (single source of truth)
 */

import { getSupabase } from '../../lib/supabase';
import { loadPersonalityPrompts, type PromptBlock } from './promptLoader';

export interface PersonalityPrompts {
  [key: string]: PromptBlock;
}

/**
 * Load personality prompts from database only
 * No file fallbacks - database is the single source of truth
 */
export async function loadPersonality(): Promise<PersonalityPrompts> {
  const supabase = getSupabase();

  try {
    const blocks = await loadPersonalityPrompts(supabase, 'pat', true);

    // Convert array to keyed object for easier access
    const prompts: PersonalityPrompts = {};
    blocks.forEach(block => {
      prompts[block.prompt_key] = block;
    });

    if (Object.keys(prompts).length < 5) {
      throw new Error(`[personality] Insufficient prompts loaded: ${Object.keys(prompts).length}`);
    }

    console.info('[personality] Loaded from DB:', Object.keys(prompts).length, 'prompts');
    return prompts;

  } catch (error) {
    console.error('[personality] Failed to load from DB:', error);
    throw new Error(`Personality system unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
