import { createClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types/user';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL is missing');
if (!supabaseAnonKey) throw new Error('VITE_SUPABASE_ANON_KEY is missing');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Dev-only, helps confirm we're talking to the right project
export function supabaseDebugConfig() {
  const tail = (supabaseAnonKey || '').slice(-8);
  return { url: supabaseUrl, anonTail: tail, hasKey: !!supabaseAnonKey };
}

// Get user profile from profiles table
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

// Upsert user profile data
export async function upsertUserProfile(userId: string, profileData: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      ...profileData
    }, {
      onConflict: 'user_id'
    })
    .select()
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export type Role = 'admin' | 'trainer' | 'user';

export async function requestRoleUpgrade(requested_role: Role, reason: string | null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const payload = { user_id: user.id, requested_role, reason, status: 'pending' as const };
  const { error } = await supabase.from('upgrade_requests').insert(payload);
  if (error) throw error;
  return true;
}

export async function approveUpgradeRequest(id: string, user_id: string, new_role: Role) {
  const { error } = await supabase.rpc('admin_approve_upgrade_request', {
    req_id: id,
    target_user_id: user_id,
    new_role,
  });
  if (error) throw error;
  return true;
}

export async function denyUpgradeRequest(id: string) {
  const { error } = await supabase.rpc('admin_deny_upgrade_request', {
    req_id: id,
  });
  if (error) throw error;
  return true;
}