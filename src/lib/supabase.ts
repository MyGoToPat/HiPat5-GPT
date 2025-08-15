// src/lib/supabase.ts
import { createClient, type PostgrestError } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail fast in dev if ENV is missing
if (!url || !anon) {
  const msg = [
    '[Supabase ENV MISSING]',
    `VITE_SUPABASE_URL: ${url ? 'SET' : 'MISSING'}`,
    `VITE_SUPABASE_ANON_KEY: ${anon ? 'SET' : 'MISSING'}`,
    'Add them to a .env.local at repo root.',
  ].join(' ')
  console.error(msg)
  if (import.meta.env.DEV) throw new Error(msg)
}

export const supabase = createClient(url!, anon!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const supabaseDebugConfig = {
  url: url || 'MISSING',
  anonPrefix: anon ? `${anon.slice(0, 6)}…${anon.slice(-4)}` : 'MISSING',
}

if (import.meta.env.DEV) {
  const mask = (s?: string) => (s ? `${s.slice(0, 22)}…` : 'MISSING')
  console.log('[Supabase] URL:', mask(url))
  console.log('[Supabase] Anon key prefix:', supabaseDebugConfig.anonPrefix)
}

// ---------- Admin helpers expected by UI ----------

export type AppRole = 'free_user' | 'pro_user' | 'trainer' | 'admin'

type UpgradeRequestRow = {
  id: string
  user_id: string
  requested_role?: AppRole | null
  message?: string | null
  status: 'pending' | 'approved' | 'denied'
  processed_by?: string | null
  processed_at?: string | null
  created_at?: string | null
}

// Gets the current signed-in user's id (throws if not signed in)
async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  const uid = data.user?.id
  if (!uid) throw new Error('Not authenticated')
  return uid
}

/**
 * End-user requests a role upgrade.
 * Inserts a row in `upgrade_requests` with status 'pending'.
 * UI typically calls this from RequestRoleUpgrade.tsx.
 */
export async function requestRoleUpgrade(
  requestedRole: AppRole = 'pro_user',
  message?: string
): Promise<{ id: string }> {
  const userId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('upgrade_requests')
    .insert<Partial<UpgradeRequestRow>>({
      user_id: userId,
      requested_role: requestedRole,
      message: message ?? null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) throw error
  return { id: data!.id }
}

/**
 * Admin approves a request:
 * 1) sets target user's `profiles.role` to newRole
 * 2) marks request as 'approved' with processed_by/processed_at
 */
export async function approveUpgradeRequest(
  requestId: string,
  targetUserId: string,
  newRole: AppRole
): Promise<void> {
  const adminId = await getCurrentUserId()

  // Elevate role in profiles (RLS expects admin to be allowed)
  const { error: profErr } = await supabase
    .from('profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('user_id', targetUserId)

  if (profErr) throw profErr

  // Mark request approved
  const { error: reqErr } = await supabase
    .from('upgrade_requests')
    .update({
      status: 'approved',
      processed_by: adminId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (reqErr) throw reqErr
}

/**
 * Admin denies a request.
 */
export async function denyUpgradeRequest(requestId: string): Promise<void> {
  const adminId = await getCurrentUserId()

  const { error } = await supabase
    .from('upgrade_requests')
    .update({
      status: 'denied',
      processed_by: adminId,
      processed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (error) throw error
}

// Legacy profile helper functions for compatibility
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertUserProfile(userId: string, profileData: any) {
  const { data, error } = await supabase
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

export { supabase as default };