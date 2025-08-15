import { supabase } from './supabase';

export async function getActiveOrgIdSafe(): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_active_org_id');
    if (error) {
      const m = (error.message || '').toLowerCase();
      if (m.includes('not exist') || m.includes('not found') || error.code === 'PGRST202') {
        return null;
      }
      throw error;
    }
    return data ?? null;
  } catch (e: any) {
    const m = (e?.message || '').toLowerCase();
    if (m.includes('not exist') || m.includes('not found') || m.includes('pgrst202')) {
      return null;
    }
    if (import.meta.env.DEV) {
      console.warn('[org] get_active_org_id skipped:', e?.message || e);
    }
    return null;
  }
}

export async function listOrganizationsSafe(): Promise<Array<{ id: string; name: string; owner_id: string }>> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id,name,owner_id');
    
    if (error) {
      const m = (error.message || '').toLowerCase();
      if (m.includes('relation') || m.includes('does not exist') || m.includes('column') || error.code === '42703') {
        return [];
      }
      throw error;
    }
    return data ?? [];
  } catch (e: any) {
    const m = (e?.message || '').toLowerCase();
    if (m.includes('relation') || m.includes('does not exist') || m.includes('column')) {
      return [];
    }
    if (import.meta.env.DEV) {
      console.warn('[org] organizations skipped:', e?.message || e);
    }
    return [];
  }
}

export async function setActiveOrgSafe(orgId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('set_active_org', { p_org_id: orgId });
    if (error) {
      const m = (error.message || '').toLowerCase();
      if (m.includes('not exist') || m.includes('not found') || error.code === 'PGRST202') {
        return false;
      }
      throw error;
    }
    return true;
  } catch (e: any) {
    const m = (e?.message || '').toLowerCase();
    if (m.includes('not exist') || m.includes('not found') || m.includes('pgrst202')) {
      return false;
    }
    if (import.meta.env.DEV) {
      console.warn('[org] set_active_org skipped:', e?.message || e);
    }
    return false;
  }
}