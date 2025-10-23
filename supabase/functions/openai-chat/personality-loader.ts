/**
 * PERSONALITY LOADER (DUAL-SCHEMA COMPATIBLE)
 * Loads Pat's personality from the database personality_config table
 * Handles both V1 (name/prompt/is_active) and V2 (config_name/content/status) schemas
 */

import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const EMERGENCY_FALLBACK = "You are Pat. Speak clearly and concisely.";

type RowV1 = { name: string; prompt: string; is_active: boolean };
type RowV2 = { config_name: string; content: string; status: 'active' | 'inactive' };

export async function loadPersonality(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try V1 schema first (name/prompt/is_active) - matches current migration
    const v1 = await supabase
      .from('personality_config')
      .select('prompt, is_active, name')
      .eq('name', 'master')
      .single();

    if (!v1.error && v1.data && (v1.data as RowV1).prompt) {
      const row = v1.data as RowV1;
      console.log('[personality-loader] V1 loaded, length:', row.prompt.length);
      return row.is_active ? row.prompt : EMERGENCY_FALLBACK;
    }

    // Fallback to V2 schema (config_name/content/status)
    const v2 = await supabase
      .from('personality_config')
      .select('content, status, config_name')
      .eq('config_name', 'master')
      .single();

    if (!v2.error && v2.data && (v2.data as RowV2).content) {
      const row = v2.data as RowV2;
      console.log('[personality-loader] V2 loaded, length:', row.content.length);
      return row.status === 'active' ? row.content : EMERGENCY_FALLBACK;
    }

    console.warn('[personality-loader] No rows matched in either schema. V1 error:', v1.error?.message, 'V2 error:', v2.error?.message);
    return EMERGENCY_FALLBACK;
  } catch (err) {
    console.error('[personality-loader] Exception:', err);
    return EMERGENCY_FALLBACK;
  }
}
