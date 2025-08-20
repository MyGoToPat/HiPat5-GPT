import { getSupabase } from './supabase';

export type Org = { id: string; name: string | null; owner_id: string | null };

export async function getActiveOrgIdSafe(): Promise<string | null> {
  try {
    const { data, error } = await getSupabase().rpc<string>('get_active_org_id');
    if (error) throw error;
    return data ?? null;
  } catch (e: any) {
    const m = (e?.message || '').toLowerCase();
    if (m.includes('not exist') || m.includes('not found')) return null;
    console.warn('[org] get_active_org_id skipped:', e?.message || e);
    return null;
  }
}

export async function setActiveOrgSafe(org_id: string): Promise<boolean> {
  try {
    const { error } = await getSupabase().rpc('set_active_org', { org_id });
    if (error) throw error;
    return true; // success
  } catch (e: any) {
    const m = (e?.message || '').toLowerCase();
    if (m.includes('not exist') || m.includes('not found')) return false;
    console.warn('[org] set_active_org skipped:', e?.message || e);
    return false;
  }
}

export async function listOrganizationsSafe(): Promise<Org[]> {
  // primary query (matches current schema)
  try {
    const { data, error } = await getSupabase()
      .from('organizations')
      .select('id,name,owner_id');
    if (error) throw error;
    return (data as Org[]) ?? [];
  } catch (e: any) {
    const msg = (e?.message || '').toLowerCase();

    // if the column is missing in some env, retry without it and synthesize nulls
    if (msg.includes('column') && msg.includes('owner_id')) {
      try {
        const { data, error } = await getSupabase().from('organizations').select('id,name');
        if (!error && Array.isArray(data)) {
          return (data as any[]).map((o) => ({ id: o.id, name: o.name ?? null, owner_id: null }));
        }
      } catch {}
    }

    // table missing → feature off
    if (msg.includes('relation') || msg.includes('does not exist')) return [];

    console.warn('[org] organizations read skipped:', e?.message || e);
    return [];
  }
}