import { createClient, type PostgrestError } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  throw new Error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.');
}

if (typeof window !== 'undefined') {
  try {
    const mask = (s: string, keep = 8) => (s.length > keep ? `${s.slice(0, keep)}…` : s);
    console.log('[Supabase] URL:', mask(url, 24));
    console.log('[Supabase] Anon key prefix:', mask(anon, 20));
  } catch {}
}

export const supabase = createClient(url, anon);
export type AppRole = 'user' | 'coach' | 'admin';

type RpcResult<T> = { data: T | null; error: PostgrestError | null; notFound?: boolean };

async function tryRpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  const { data, error } = await supabase.rpc<T>(fn, args as never);
  const notFound =
    !!error &&
    (/not\s*found/i.test(error.message || '') || error.code === 'PGRST116' || error.code === '42883');
  return { data, error, notFound };
}

export async function requestRoleUpgrade(
  requestId: string,
  userId: string,
  reason?: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const rpc = await tryRpc<{ id: string }>('request_role_upgrade', {
    request_id: requestId,
    user_id: userId,
    reason: reason ?? null,
  });
  if (!rpc.error && rpc.data) return { ok: true, id: rpc.data.id };
  if (!rpc.notFound && rpc.error) return { ok: false, error: rpc.error.message ?? 'request_role_upgrade failed' };

  const { data, error } = await supabase
    .from('role_upgrade_requests')
    .insert({ id: requestId, user_id: userId, reason: reason ?? null, status: 'pending' })
    .select('id')
    .maybeSingle();

  if (error) return { ok: false, error: error.message ?? 'Failed to insert role upgrade request' };
  return { ok: true, id: data?.id ?? requestId };
}

export async function approveUpgradeRequest(
  requestId: string,
  userId: string,
  newRole: AppRole
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rpc = await tryRpc<null>('approve_role_upgrade', {
    request_id: requestId,
    user_id: userId,
    new_role: newRole,
  });
  if (!rpc.error && !rpc.notFound) return { ok: true };
  if (!rpc.notFound && rpc.error) return { ok: false, error: rpc.error.message ?? 'approve_role_upgrade failed' };

  const updReq = await supabase
    .from('role_upgrade_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', requestId);
  if (updReq.error) return { ok: false, error: updReq.error.message ?? 'Failed to update request status' };

  const updProfile = await supabase.from('profiles').update({ role: newRole }).eq('user_id', userId);
  if (updProfile.error) return { ok: false, error: updProfile.error.message ?? 'Failed to update profile role' };

  return { ok: true };
}

export async function denyUpgradeRequest(
  requestId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rpc = await tryRpc<null>('deny_role_upgrade', { request_id: requestId, user_id: userId });
  if (!rpc.error && !rpc.notFound) return { ok: true };
  if (!rpc.notFound && rpc.error) return { ok: false, error: rpc.error.message ?? 'deny_role_upgrade failed' };

  const { error } = await supabase
    .from('role_upgrade_requests')
    .update({ status: 'denied', denied_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) return { ok: false, error: error.message ?? 'Failed to update request status' };
  return { ok: true };
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