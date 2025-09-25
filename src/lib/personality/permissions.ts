/* Aggregates per-role flags from child agents and checks user access (UI-only).
   Assumes getPersonalityAgents() returns AgentConfig-like objects with fields:
   { id, roleSlug?, enabled, enabledForPaid?, enabledForFreeTrial?, enabledForBeta? }.
*/
import { getPersonalityAgents } from '../../state/personalityStore';

export interface UserProfileLike {
  role: "admin" | "beta" | "paid_user" | "free_user" | string;
  trial_ends?: string | null; // ISO8601 or null
}

export interface RoleAccessFlags {
  enabled: boolean;
  enabledForPaid: boolean;
  enabledForFreeTrial: boolean;
  enabledForBeta: boolean;
}

/** Aggregate OR across agents that belong to the roleTarget. */
export function getRoleAccessFlags(roleTarget: string): RoleAccessFlags {
  const agents = Object.values(getPersonalityAgents?.() ?? {});
  let enabled = false;
  let enabledForPaid = false;
  let enabledForFreeTrial = false;
  let enabledForBeta = false;

  for (const a of agents) {
    // Check if agent belongs to this role
    const belongs =
      (a as any).roleSlug === roleTarget ||
      (a as any).role === roleTarget ||
      (a as any).target === roleTarget ||
      // For now, determine role membership by checking if the agent ID contains the role target
      // or if there's explicit role assignment in the future
      a.id.includes(roleTarget) ||
      roleTarget === "pats-personality";

    if (!belongs) continue;

    if ((a as any).enabled) enabled = true;
    if ((a as any).enabledForPaid ?? true) enabledForPaid = true;
    if ((a as any).enabledForFreeTrial ?? true) enabledForFreeTrial = true;
    if ((a as any).enabledForBeta ?? false) enabledForBeta = true;
  }
  return { enabled, enabledForPaid, enabledForFreeTrial, enabledForBeta };
}

function isTrialActive(trial_ends?: string | null): boolean {
  if (!trial_ends) return false;
  const t = Date.parse(trial_ends);
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

/** Decision table (exact; Beta = use-only). */
export function checkPermissionsForTarget(
  user: UserProfileLike,
  roleTarget: string
): { allowed: boolean; reason: string } {
  const flags = getRoleAccessFlags(roleTarget);

  if (!flags.enabled) return { allowed: false, reason: "role disabled" };

  switch (user.role) {
    case "admin":
      return { allowed: true, reason: "admin" };
    case "beta":
      return flags.enabledForBeta
        ? { allowed: true, reason: "beta enabled" }
        : { allowed: false, reason: "beta disabled for role" };
    case "paid_user":
      return flags.enabledForPaid
        ? { allowed: true, reason: "paid allowed" }
        : { allowed: false, reason: "paid disabled for role" };
    case "free_user": {
      const trial = isTrialActive(user.trial_ends);
      if (trial) {
        return flags.enabledForPaid
          ? { allowed: true, reason: "trial behaves as paid" }
          : { allowed: false, reason: "trial but paid disabled for role" };
      }
      return flags.enabledForFreeTrial
        ? { allowed: true, reason: "free trial flag enabled" }
        : { allowed: false, reason: "free trial flag disabled" };
    }
    default:
      return { allowed: false, reason: "unknown role" };
  }
}

export function getPermissionDeniedMessage(roleTarget: string, userRole: string): string {
  const roleNames: Record<string, string> = {
    tmwya: "meal logging",
    workout: "workout tracking", 
    mmb: "feedback and improvement suggestions"
  };
  
  const featureName = roleNames[roleTarget] || roleTarget;
  
  if (userRole === 'free_user') {
    return `I'd love to help with ${featureName}, but that feature is available for paid users. I can still chat about general health and fitness topics!`;
  }
  
  return `I'm sorry, but ${featureName} is not available with your current access level. Please contact support for more information.`;
}