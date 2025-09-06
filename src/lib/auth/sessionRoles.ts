import { getSupabase } from '../supabase';

function collectRoles(user: any): string[] {
  const out: string[] = [];
  const add = (v: any) => {
    if (!v) return;
    if (Array.isArray(v)) out.push(...v.map(String));
    else out.push(String(v));
  };
  add(user?.app_metadata?.roles);
  add(user?.user_metadata?.roles);
  add(user?.app_metadata?.role);
  add(user?.user_metadata?.role);
  return out.map(r => r.toLowerCase());
}

export async function getSessionRoles(): Promise<{ roles: string[]; email: string | null }> {
  const sb = getSupabase();
  const { data: { user } } = await sb.auth.getUser();
  const roles = collectRoles(user);
  const email = (user?.email || '').toLowerCase();

  // Optional: allowlist via env (comma-separated)
  const allow = String(import.meta?.env?.VITE_ADMIN_EMAILS || '')
    .toLowerCase()
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allow.includes(email) && !roles.includes('admin')) roles.push('admin');

  return { roles, email };
}