export type RouteHit = { 
  route: "role" | "tool" | "pat" | "none"; 
  target?: string; 
  params?: Record<string, any> 
};

export const ROUTE_REGISTRY = {
  tmwya: { 
    type: "role" as const, 
    patterns: [/\b(calories?|macros?|protein|carbs?|ate|meal|food|nutrition)\b/i] 
  },
  workout: { 
    type: "role" as const, 
    patterns: [/\b(workout|exercise|gym|training|lifted|reps|sets|weights?)\b/i] 
  },
  mmb: { 
    type: "role" as const, 
    patterns: [/\b(feedback|improve|better|suggestion|enhance|make.*better)\b/i] 
  }
  // Future roles added here without touching orchestrator code
};

export function fastRoute(userMessage: string): RouteHit {
  const message = userMessage.toLowerCase().trim();
  
  for (const [roleKey, config] of Object.entries(ROUTE_REGISTRY)) {
    for (const pattern of config.patterns) {
      if (pattern.test(message)) {
        return { route: "role", target: roleKey };
      }
    }
  }
  
  return { route: "none" };
}

export function resolveRoleTarget(slug: string): string {
  // No-op for now, but gives us one place to normalize slugs if UI names drift
  return slug;
}