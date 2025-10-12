/* Deterministic routing registry + fastRoute helper (UI-only) */
export type RouteHit =
  | { route: "role"; target: string; params?: Record<string, any> }
  | { route: "tool"; target: string; params?: Record<string, any> }
  | { route: "pat" | "none"; params?: Record<string, any> };

type RegistryEntry =
  | { type: "role"; patterns: RegExp[] }
  | { type: "tool"; patterns: RegExp[] };

export const ROUTE_REGISTRY: Record<string, RegistryEntry> = {
  'macro-question': {
    type: "role",
    patterns: [
      // HIGH PRIORITY: Questions about macros/calories (informational, not logging)
      // Pattern 1: "tell me / give me / what are + macros"
      /^\s*(tell|give|what\s+are)\s+(me\s+)?(the\s+)?macros?\b/i,
      // Pattern 2: "calories/protein/carbs/fat/macros + of/for"
      /^\s*(calories?|protein|carbs?|fat|macros?)\b.*\b(of|for)\b/i,
      // Pattern 3: General informational patterns
      /\b(tell\s+me|what\s+are|what\s+is|how\s+many|give\s+me|show\s+me)\s+(the\s+)?(macros?|calories?|nutrition)\s+(of|for|in)\b/i,
      /\b(macros?|calories?|nutrition)\s+(of|for|in)\s+/i,
    ],
  },
  'macro-logging': {
    type: "role",
    patterns: [
      // Post-macro-discussion logging commands
      // Pattern 1: Simple "log" commands (after macro discussion)
      /^\s*(log|log\s+it|log\s+all|log\s+that|log\s+this)\s*$/i,
      // Pattern 2: "log the X" or "log X only"
      /^\s*log\s+(the\s+)?([a-zA-Z0-9\s]+?)\s*(only)?\s*$/i,
      // Pattern 3: "log X with Y" (quantity adjustments)
      /^\s*log\s+.+\s+with\s+.+$/i,
    ],
  },
  tmwya: {
    type: "role",
    patterns: [
      // ONLY trigger for actual LOGGING intent with explicit keywords
      /\b(log|save|add|record)\b.*\b(meal|food|breakfast|lunch|dinner|snack)\b/i,
      /\b(i\s+ate|i\s+had|i\s+just\s+ate|i\s+just\s+had|i\s+consumed)\b/i,
      /\b(for\s+breakfast|for\s+lunch|for\s+dinner|for\s+snack)\b.*\b(at|around)\s+\d/i,
    ],
  },
  workout: {
    type: "role",
    patterns: [
      /\b(workout|exercise|gym|training|lifted|reps|sets|weights?|squat|bench|deadlift|cardio|running|cycling)\b/i,
    ],
  },
  mmb: {
    type: "role",
    patterns: [
      /\b(feedback|improve|better|suggestion|enhance|make.*better|optimize|fix|help.*improve)\b/i,
    ],
  },
};

export function fastRoute(userText: string): RouteHit {
  const text = userText ?? "";

  // Track which routes match
  const matches: string[] = [];

  for (const [slug, entry] of Object.entries(ROUTE_REGISTRY)) {
    for (const rx of entry.patterns) {
      if (rx.test(text)) {
        matches.push(slug);
        break; // Found a match for this route, move to next
      }
    }
  }

  // GUARDRAIL 1: macro-logging takes priority over everything (requires prior macro discussion context)
  if (matches.includes('macro-logging')) {
    return { route: "role", target: "macro-logging" };
  }

  // GUARDRAIL 2: If both macro-question and tmwya match, decide which takes priority
  if (matches.includes('macro-question') && matches.includes('tmwya')) {
    // Check for explicit logging keywords with meal context
    const hasLoggingIntent = /\b(log|save|add|record)\b.*\b(meal|food|breakfast|lunch|dinner|snack)\b/i.test(text);

    if (hasLoggingIntent) {
      // User explicitly wants to log with meal context → tmwya wins
      return { route: "role", target: "tmwya" };
    } else {
      // No explicit logging context → macro-question wins (informational query)
      return { route: "role", target: "macro-question" };
    }
  }

  // Return first match (priority order maintained by ROUTE_REGISTRY object order)
  if (matches.length > 0) {
    const slug = matches[0];
    const entry = ROUTE_REGISTRY[slug];
    if (entry.type === "role") return { route: "role", target: slug };
    if (entry.type === "tool") return { route: "tool", target: slug };
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