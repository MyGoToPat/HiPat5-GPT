// (Sept-4 snapshot) src/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase: SupabaseClient = createClient(url, anon);

// Simple getter used across legacy components
export function getSupabase(): SupabaseClient {
  return supabase;
}

// ---- Types ----
export type AppRole = 'user' | 'trainer' | 'admin';

export type ProfileRow = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level?: string | null;
  sex?: string | null;
  dob?: string | null;
  role?: AppRole | null;
  created_at?: string | null;
  updated_at?: string | null;
};

// ---- Profile helpers used by Profile UI ----
export async function getUserProfile(): Promise<ProfileRow | null> {
  const auth = await supabase.auth.getUser();
  const uid = auth.data.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();

  if (error) {
    console.error('[getUserProfile] error', error);
    return null;
  }
  return data as ProfileRow;
}

export async function upsertUserProfile(patch: Partial<ProfileRow>): Promise<{ ok: boolean }> {
  const auth = await supabase.auth.getUser();
  const uid = auth.data.user?.id;
  if (!uid) return { ok: false };

  const payload = { id: uid, ...patch };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('[upsertUserProfile] error', error);
    return { ok: false };
  }
  return { ok: true };
}

// ---- Role upgrade helpers (expected by original UI) ----
export async function requestRoleUpgrade(requested: AppRole, note?: string) {
  const auth = await supabase.auth.getUser();
  const uid = auth.data.user?.id;
  if (!uid) throw new Error('not signed in');

  const { error } = await supabase.from('upgrade_requests').insert({
    user_id: uid,
    requested_role: requested,
    note: note ?? null,
  });
  if (error) throw error;
}

export async function approveUpgradeRequest(requestId: string, grantRole: AppRole) {
  const { error: txErr } = await supabase.rpc('approve_upgrade_request', {
    p_request_id: requestId,
    p_role: grantRole,
  });
  if (txErr) throw txErr;
}

export async function denyUpgradeRequest(requestId: string, reason?: string) {
  const { error } = await supabase
    .from('upgrade_requests')
    .update({ denied_reason: reason ?? null, status: 'denied' })
    .eq('id', requestId);
  if (error) throw error;
}

export default supabase;