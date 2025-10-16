/**
 * Feature Flag System
 *
 * Controls gradual rollout of Swarm 2.2 architecture.
 * Supports per-user overrides and percentage-based rollout.
 */

import { getSupabase } from './supabase';
import { isAdmin } from './auth/isAdmin';

export interface FeatureFlags {
  swarm_v2_enabled: boolean;
  swarm_v2_rollout_pct: number;
  swarmsV2Admin: boolean;
  personaDefaultRouter: boolean; // Always default to persona (AMA) when no domain match
  adminSwarmsLegacy: boolean; // Show legacy Agent Config page
  adminSwarmsEnhanced: boolean; // Show enhanced Swarm Versions page
  source: 'user_override' | 'rollout_percentage' | 'default';
}

/**
 * Get feature flags for a user
 */
export async function getFeatureFlags(userId: string): Promise<FeatureFlags> {
  const supabase = getSupabase();

  // Layer 0: Check admin status first
  const userIsAdmin = await isAdmin();

  // In dev mode, also check for VITE_SWARMS_V2_ADMIN override
  const isDev = import.meta.env.MODE !== 'production';
  const devOverride = isDev && import.meta.env.VITE_SWARMS_V2_ADMIN === 'true';

  const swarmsV2AdminEnabled = userIsAdmin || devOverride;

  // Layer 1: Check user_preferences.feature_flags for per-user override
  const { data: userPrefs } = await supabase
    .from('user_preferences')
    .select('feature_flags')
    .eq('user_id', userId)
    .maybeSingle();

  if (userPrefs?.feature_flags?.swarm_v2_enabled !== undefined) {
    return {
      swarm_v2_enabled: userPrefs.feature_flags.swarm_v2_enabled,
      swarm_v2_rollout_pct: 100,
      swarmsV2Admin: swarmsV2AdminEnabled,
      personaDefaultRouter: true, // Always enabled - core AMA functionality
      adminSwarmsLegacy: userIsAdmin, // Show legacy page to admins
      adminSwarmsEnhanced: swarmsV2AdminEnabled, // Show enhanced page to admins
      source: 'user_override'
    };
  }

  // Layer 2: Global rollout percentage (from environment variable)
  const rolloutPct = parseInt(import.meta.env.VITE_SWARM_V2_ROLLOUT_PCT || '0', 10);

  // Deterministic assignment based on userId hash
  const userHash = hashUserId(userId);
  const isInRollout = (userHash % 100) < rolloutPct;

  return {
    swarm_v2_enabled: isInRollout,
    swarm_v2_rollout_pct: rolloutPct,
    swarmsV2Admin: swarmsV2AdminEnabled,
    personaDefaultRouter: true, // Always enabled - core AMA functionality
    adminSwarmsLegacy: userIsAdmin, // Show legacy page to admins
    adminSwarmsEnhanced: swarmsV2AdminEnabled, // Show enhanced page to admins
    source: 'rollout_percentage'
  };
}

/**
 * Hash user ID for deterministic bucketing
 * Same user always gets same bucket assignment
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Enable Swarm 2.2 for a specific user (admin function)
 */
export async function enableSwarmV2ForUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('user_preferences')
    .select('feature_flags')
    .eq('user_id', userId)
    .maybeSingle();

  const updatedFlags = {
    ...(existing?.feature_flags || {}),
    swarm_v2_enabled: true
  };

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      feature_flags: updatedFlags
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Disable Swarm 2.2 for a specific user (admin function)
 */
export async function disableSwarmV2ForUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('user_preferences')
    .select('feature_flags')
    .eq('user_id', userId)
    .maybeSingle();

  const updatedFlags = {
    ...(existing?.feature_flags || {}),
    swarm_v2_enabled: false
  };

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      feature_flags: updatedFlags
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Clear user override (revert to rollout percentage)
 */
export async function clearSwarmV2Override(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('user_preferences')
    .select('feature_flags')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    return { success: true }; // Nothing to clear
  }

  const updatedFlags = { ...(existing.feature_flags || {}) };
  delete updatedFlags.swarm_v2_enabled;

  const { error } = await supabase
    .from('user_preferences')
    .update({ feature_flags: updatedFlags })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
