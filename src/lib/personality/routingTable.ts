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
  // Add more roles here without touching orchestrator code
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
  // No-op for now, but gives us one place to normalize slugs if UI names drift
  return slug;
}