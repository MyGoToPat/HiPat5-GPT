import { getPersonalityAgents } from "@/state/personalityStore";
import type { UserProfile } from "@/types/user";

export interface RoleAccessFlags {
  enabled: boolean;
  enabledForPaid: boolean;
  enabledForFreeTrial: boolean;
  enabledForBeta: boolean;
}

export function getRoleAccessFlags(roleTarget: string): RoleAccessFlags {
  const agentsRec = getPersonalityAgents();
  
  // Find all agents that belong to this role
  const roleAgents = Object.values(agentsRec).filter(agent => {
    // For now, we'll determine role membership by checking if the agent ID contains the role target
    // or if there's explicit role assignment in the future
    return agent.id.includes(roleTarget) || roleTarget === "pats-personality";
  });
  
  if (roleAgents.length === 0) {
    // If no agents found for this role, default to restrictive settings
    return {
      enabled: false,
      enabledForPaid: false,
      enabledForFreeTrial: false,
      enabledForBeta: false
    };
  }
  
  // Aggregate using OR logic - if any agent in the role allows access, the role allows access
  return {
    enabled: roleAgents.some(agent => agent.enabled),
    enabledForPaid: roleAgents.some(agent => agent.enabledForPaid ?? true),
    enabledForFreeTrial: roleAgents.some(agent => agent.enabledForFreeTrial ?? true),
    enabledForBeta: roleAgents.some(agent => agent.enabledForBeta ?? false) // Default to false if not set
  };
}

export function checkPermissionsForTarget(user: UserProfile, roleTarget: string): boolean {
  const flags = getRoleAccessFlags(roleTarget);
  
  // If the role itself is disabled, block regardless of tier
  if (!flags.enabled) {
    return false;
  }
  
  // Permission decision table
  if (user.role === 'admin') return true;
  if (user.role === 'beta') return flags.enabledForBeta;
  if (user.role === 'paid_user') return flags.enabledForPaid;
  if (user.role === 'free_user') {
    // Check if user has active trial (≤3 days)
    const trialEnds = (user as any).trial_ends; // Assuming this field exists
    if (trialEnds) {
      const trialEndDate = new Date(trialEnds);
      const now = new Date();
      const inTrial = trialEndDate > now;
      
      if (inTrial) {
        // Trial behaves as Paid
        return flags.enabledForPaid;
      }
    }
    
    // No trial or expired trial - check free tier access
    return flags.enabledForFreeTrial;
  }
  
  return false; // Default deny for unknown roles
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