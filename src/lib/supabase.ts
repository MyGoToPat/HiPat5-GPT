// -- AUTO-GENERATED: canonical Supabase client w/ legacy surface --
import { createClient } from '@supabase/supabase-js';

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined) ||
  'https://jdtogitfqptdrxkczdbw.supabase.co';

const anon =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdG9naXRmcXB0ZHJ4a2N6ZGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NTU0NTQsImV4cCI6MjA3MDUzMTQ1NH0.V7KN9mE1YlPYQZmWz-UO2vUqpTnoX6ZvyDoytYlucF8';

export const supabase = createClient(url, anon);
export default supabase;

// ---- Back-compat helpers expected by existing code ----
export const getSupabase = () => supabase;

export async function getUserProfile(user_id: string) {
  if (!user_id) throw new Error('getUserProfile: missing user_id');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---- BEGIN AUTO-STUBS (do not edit below; regenerated) ----
export const upsertUserProfile = (..._args: any[]): any => { console.warn('[supabase legacy stub] upsertUserProfile called'); return undefined as any; };
export const requestRoleUpgrade = (..._args: any[]): any => { console.warn('[supabase legacy stub] requestRoleUpgrade called'); return undefined as any; };
export const approveUpgradeRequest = (..._args: any[]): any => { console.warn('[supabase legacy stub] approveUpgradeRequest called'); return undefined as any; };
export const denyUpgradeRequest = (..._args: any[]): any => { console.warn('[supabase legacy stub] denyUpgradeRequest called'); return undefined as any; };
// ---- END AUTO-STUBS ----