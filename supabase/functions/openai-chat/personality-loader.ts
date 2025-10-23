/**
 * PERSONALITY LOADER
 * Loads Pat's personality from the database personality_config table
 */

import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

export const EMERGENCY_FALLBACK = "You are Pat. Speak clearly and concisely.";

export async function loadPersonality(supabaseUrl: string, supabaseKey: string): Promise<string> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('personality_config')
      .select('content')
      .eq('config_name', 'master')
      .eq('status', 'active')
      .single();

    if (error || !data) {
      console.warn('[personality-loader] DB load failed, using emergency fallback:', error?.message);
      return EMERGENCY_FALLBACK;
    }

    console.log('[personality-loader] Loaded from DB, length:', data.content.length);
    return data.content;
  } catch (err) {
    console.error('[personality-loader] Exception:', err);
    return EMERGENCY_FALLBACK;
  }
}
