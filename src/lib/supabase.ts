// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail fast in dev if env is missing (prevents "Create a new Supabase" prompts)
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

// Admin upgrade request functions
export async function approveUpgradeRequest(requestId: string, userId: string, newRole: string) {
  // First, update the user's role
  const { error: roleError } = await supabase.rpc('rpc_set_user_role', {
    target_user_id: userId,
    new_role: newRole
  });
  
  if (roleError) throw roleError;

  // Then update the upgrade request status
  const { error: requestError } = await supabase
    .from('upgrade_requests')
    .update({
      status: 'approved',
      processed_by: (await supabase.auth.getUser()).data.user?.id,
      processed_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (requestError) throw requestError;
}

export async function denyUpgradeRequest(requestId: string) {
  const { error } = await supabase
    .from('upgrade_requests')
    .update({
      status: 'denied',
      processed_by: (await supabase.auth.getUser()).data.user?.id,
      processed_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) throw error;
}