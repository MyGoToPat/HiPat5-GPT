import { supabase } from './supabase';

export type RolloutStage = 'admin' | 'beta' | 'public';

export interface RoleAccessRecord {
  role_name: string;
  stage: RolloutStage;
  enabled: boolean;
  updated_at: string;
}

export async function getAllowedRoles(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('allowed_roles');

  if (error) {
    console.error('[roleAccess] Error fetching allowed roles:', error);
    return [];
  }

  return (data || []).map((r: { role_name: string }) => r.role_name);
}

export async function hasRoleAccess(userId: string, roleName: string): Promise<boolean> {
  const allowed = await getAllowedRoles(userId);
  return allowed.includes(roleName);
}

export async function getUserRoleFlags(userId: string): Promise<{ isAdmin: boolean; isBeta: boolean }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('is_admin, is_beta')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return { isAdmin: false, isBeta: false };
  }

  return {
    isAdmin: data.is_admin || false,
    isBeta: data.is_beta || false
  };
}

export async function getRoleAccessList(): Promise<RoleAccessRecord[]> {
  const { data, error } = await supabase
    .from('role_access')
    .select('*')
    .order('role_name');

  if (error) {
    console.error('[roleAccess] Error fetching role access list:', error);
    return [];
  }

  return data || [];
}

export async function updateRoleAccess(
  roleName: string,
  stage: RolloutStage,
  enabled: boolean
): Promise<void> {
  const { error } = await supabase
    .from('role_access')
    .upsert({
      role_name: roleName,
      stage,
      enabled,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'role_name'
    });

  if (error) {
    throw new Error(`Failed to update role access: ${error.message}`);
  }
}
