/**
 * PERSONALITY SYSTEM BOOTSTRAP - DB ONLY
 * Loads and initializes Pat's personality system from database
 *
 * This is the canonical entry point for personality loading.
 * DB is the single source of truth - no file fallbacks.
 */

import { createClient } from '@supabase/supabase-js';
import { loadPersonalityFromDB } from './promptLoader';

// Create DB client for personality loading
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Load personality prompts from DB
 * @returns Promise<PromptBlock[]> - Loaded and sorted personality prompts
 */
export async function loadPersonality() {
  try {
    const prompts = await loadPersonalityFromDB(supabase);
    return prompts;
  } catch (error) {
    console.error('[personality-bootstrap] Failed to load from DB:', error);
    throw new Error(`Personality system unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if personality system is available
 * @returns Promise<boolean>
 */
export async function isPersonalityAvailable(): Promise<boolean> {
  try {
    await loadPersonality();
    return true;
  } catch {
    return false;
  }
}
