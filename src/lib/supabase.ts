// -- AUTO-GENERATED: canonical Supabase client w/ legacy surface --
import { createClient } from '@supabase/supabase-js';

// ENV CHECK - Development only diagnostics
if (!import.meta.env.PROD) {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  console.info('[ENV CHECK] Supabase URL =', envUrl || 'undefined');
  console.info('[ENV CHECK] ANON prefix =', envAnon ? envAnon.substring(0, 12) + '...' : 'undefined');
  
  const expectedUrl = 'https://jdtogitfqptdrxkczdbw.supabase.co';
  if (envUrl && envUrl !== expectedUrl) {
    console.error('[ENV CHECK] Wrong Supabase project URL - Expected:', expectedUrl, 'Got:', envUrl);
  }
}

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

// Dashboard metrics functions
export async function getDashboardMetrics(user_id: string) {
  if (!user_id) throw new Error('getDashboardMetrics: missing user_id');
  const { data, error } = await supabase.rpc('get_dashboard_metrics', { user_id });
  if (error) throw error;
  return data?.[0] || { workouts: 0, day_streak: 0, achievements: 0 };
}

export async function updateDailyActivitySummary(user_id: string, activity_date?: string) {
  if (!user_id) throw new Error('updateDailyActivitySummary: missing user_id');
  const date = activity_date || new Date().toISOString().slice(0, 10);
  const { error } = await supabase.rpc('update_daily_activity_summary', {
    p_user_id: user_id,
    p_activity_date: date
  });
  if (error) throw error;
}

export async function checkAndAwardAchievements(user_id: string) {
  if (!user_id) throw new Error('checkAndAwardAchievements: missing user_id');
  const { data, error } = await supabase.rpc('check_and_award_achievements', { user_id });
  if (error) throw error;
  return data || 0;
}

// Dashboard metrics functions
export async function getDashboardMetrics(user_id: string) {
  if (!user_id) throw new Error('getDashboardMetrics: missing user_id');
  const { data, error } = await supabase.rpc('get_dashboard_metrics', { user_id });
  if (error) throw error;
  return data?.[0] || { workouts: 0, day_streak: 0, achievements: 0 };
}

export async function updateDailyActivitySummary(user_id: string, activity_date?: string) {
  if (!user_id) throw new Error('updateDailyActivitySummary: missing user_id');
  const date = activity_date || new Date().toISOString().slice(0, 10);
  const { error } = await supabase.rpc('update_daily_activity_summary', {
    p_user_id: user_id,
    p_activity_date: date
  });
  if (error) throw error;
}
// ---- BEGIN AUTO-STUBS (do not edit below; regenerated) ----
export const upsertUserProfile = (..._args: any[]): any => { console.warn('[supabase legacy stub] upsertUserProfile called'); return undefined as any; };
export const requestRoleUpgrade = (..._args: any[]): any => { console.warn('[supabase legacy stub] requestRoleUpgrade called'); return undefined as any; };
export const approveUpgradeRequest = (..._args: any[]): any => { console.warn('[supabase legacy stub] approveUpgradeRequest called'); return undefined as any; };
export const denyUpgradeRequest = (..._args: any[]): any => { console.warn('[supabase legacy stub] denyUpgradeRequest called'); return undefined as any; };
// ---- END AUTO-STUBS ----