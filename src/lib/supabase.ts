import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * (OPTIONAL) Lock the expected host to avoid accidental project swaps.
 * If your Supabase Project URL host is different, change EXPECTED_HOST below.
 */
const EXPECTED_HOST = 'jdtogitfqptdrxkczdbw.supabase.co'; // <-- update ONLY if your project host differs

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Define them in .env (Vite) or your hosting env.'
  );
}

let hostOk = true;
try {
  const actualHost = new URL(SUPABASE_URL).host;
  if (EXPECTED_HOST && actualHost !== EXPECTED_HOST) {
    hostOk = false;
    // Don't throw in production; warn noisily in dev so you can see it.
    console.warn('[Supabase] Host mismatch', { actualHost, EXPECTED_HOST });
  }
} catch (e) {
  console.warn('[Supabase] Could not parse URL', SUPABASE_URL, e);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** 
 * Diagnostic helper: call this from anywhere (e.g., after sign-in) to verify wiring.
 * It logs: host, anon prefix, session presence, a tiny read ping (profiles).
 * It does NOT leak your full anon key.
 */
export async function supabaseSelfCheck() {
  const anonPrefix = SUPABASE_ANON_KEY.slice(0, 12);
  const host = (() => { try { return new URL(SUPABASE_URL).host; } catch { return 'invalid-url'; } })();

  const sessionRes = await supabase.auth.getSession();
  const hasSession = !!sessionRes.data.session?.user;

  // Lightweight read ping that works even with RLS (will just return zero rows if blocked)
  const { data: pingData, error: pingErr } = await supabase
    .from('profiles')
    .select('user_id')
    .limit(1);

  const ok = hostOk && !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

  const report = {
    ok,
    host,
    expectedHost: EXPECTED_HOST,
    anonPrefix,                 // never log the full key
    hasSession,
    profilesPingOk: !pingErr,   // true = request executed (not necessarily returned rows)
    pingErrCode: pingErr?.code,
  };

  if (import.meta.env.DEV) {
    console.log('[Supabase SelfCheck]', report);
  }
  return report;
}

// Dev-only breadcrumb (safe)
if (import.meta.env.DEV) {
  console.log('[Supabase]', {
    urlHost: (() => { try { return new URL(SUPABASE_URL).host; } catch { return 'invalid-url'; } })(),
    anonPrefix: SUPABASE_ANON_KEY.slice(0, 12),
  });
}

// Legacy types and helper functions for compatibility
export type AppRole = 'user' | 'coach' | 'admin';

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

// Upgrade request functions
export async function requestRoleUpgrade(requestedRole: string) {
  const { data, error } = await supabase
    .from('upgrade_requests')
    .insert({
      requested_role: requestedRole,
      user_id: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function approveUpgradeRequest(requestId: string) {
  const { data, error } = await supabase
    .from('upgrade_requests')
    .update({
      status: 'approved',
      processed_by: (await supabase.auth.getUser()).data.user?.id,
      processed_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function denyUpgradeRequest(requestId: string) {
  const { data, error } = await supabase
    .from('upgrade_requests')
    .update({
      status: 'denied',
      processed_by: (await supabase.auth.getUser()).data.user?.id,
      processed_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export { supabase as default };