/* Deterministic routing registry + fastRoute helper (UI-only) */
export type RouteHit =
  | { route: "role"; target: string; params?: Record<string, any> }
  | { route: "tool"; target: string; params?: Record<string, any> }
  | { route: "pat" | "none"; params?: Record<string, any> };

type RegistryEntry =
  | { type: "role"; patterns: RegExp[] }
  | { type: "tool"; patterns: RegExp[] };

export const ROUTE_REGISTRY: Record<string, RegistryEntry> = {
  tmwya: {
    type: "role",
    patterns: [
      /\b(calories?|macros?|protein|carbs?|carbohydrates?|fat|ate|meal|meals|food|foods|nutrition|nutritional)\b/i,
    ],
  },
  workout: {
    type: "role", 
    patterns: [
      /\b(workout|exercise|gym|training|lifted|reps|sets|weights?)\b/i,
    ],
  },
  mmb: {
    type: "role",
    patterns: [
      /\b(feedback|improve|better|suggestion|enhance|make.*better)\b/i,
    ],
  },
  workout: {
    type: "role", 
    patterns: [
      /\b(workout|exercise|gym|training|lifted|reps|sets|weights?)\b/i,
    ],
  },
  mmb: {
    type: "role",
    patterns: [
      /\b(feedback|improve|better|suggestion|enhance|make.*better)\b/i,
    ],
  },
};

export function fastRoute(userText: string): RouteHit {
  const text = userText ?? "";
  for (const [slug, entry] of Object.entries(ROUTE_REGISTRY)) {
    for (const rx of entry.patterns) {
      if (rx.test(text)) {
        if (entry.type === "role") return { route: "role", target: slug };
        if (entry.type === "tool") return { route: "tool", target: slug };
      }
    }
  }
  return { route: "none" };
}

export function resolveRoleTarget(slug: string): string {
  // Normalize role target slugs
  const mapping: Record<string, string> = {
    'tell-me-what-you-ate': 'tmwya',
    'tell-me-about-your-workout': 'workout',
    'make-me-better': 'mmb'
  };
  return mapping[slug] || slug;
  return slug;
}