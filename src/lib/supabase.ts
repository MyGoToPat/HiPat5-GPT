import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url) throw new Error('VITE_SUPABASE_URL is missing');
  if (!anon) throw new Error('VITE_SUPABASE_ANON_KEY is missing');

  client = createClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

// Legacy types for compatibility
export type AppRole = 'user' | 'coach' | 'admin';

// Legacy profile helper functions for compatibility
export async function getUserProfile(userId: string) {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertUserProfile(userId: string, profileData: any) {
  const { data, error } = await getSupabase()
    .from('profiles')
    .upsert({
      user_id: userId,
      ...profileData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export type Role = 'admin' | 'trainer' | 'user';

// Upgrade request functions
export async function requestRoleUpgrade(requestedRole: string, reason?: string | null) {
  const { data: { user } } = await getSupabase().auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data, error } = await getSupabase()
    .from('upgrade_requests')
    .insert({
      requested_role: requestedRole,
      user_id: user.id,
      reason: reason
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveUpgradeRequest(requestId: string, userId: string, newRole: string) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  // Update the request status
  const { error: requestError } = await supabase
    .from('upgrade_requests')
    .update({
      status: 'approved',
      processed_by: user.id,
      processed_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (requestError) throw requestError;

  // Update the user's role
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('user_id', userId);

  if (profileError) throw profileError;
}

export async function denyUpgradeRequest(requestId: string) {
  const { data: { user } } = await getSupabase().auth.getUser();
  if (!user) throw new Error('No authenticated user');

  const { data, error } = await getSupabase()
    .from('upgrade_requests')
    .update({
      status: 'denied',
      processed_by: user.id,
      processed_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}