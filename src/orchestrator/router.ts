/**
 * Central Orchestrator Router
 * Routes user input to exactly ONE target swarm
 * Persona post-processors run AFTER role swarm returns content
 */

import { RULES } from '../config/personality/prompts';

export type SwarmTarget = 'persona' | 'macro' | 'tmwya' | 'mmb';

export interface RouteResult {
  target: SwarmTarget;
  confidence: number;
  reason: string;
}

/**
 * Route user message to appropriate swarm
 * Priority routing with regex + heuristics
 */
export function routeToSwarm(
  userMessage: string,
  context?: {
    hasUnconsumedMacroPayload?: boolean;
    sessionId?: string;
  }
): RouteResult {
  const text = userMessage.toLowerCase().trim();

  // ========================================================================
  // Priority 1: Macro Logging (requires unconsumed payload)
  // ========================================================================
  if (context?.hasUnconsumedMacroPayload) {
    const macroLogPatterns = [
      /^\s*(log|log\s+it|log\s+all|log\s+that|save\s+it)\s*$/i,
      /^\s*log\s+(the\s+)?([a-zA-Z0-9\s]+?)\s*(only)?\s*$/i,
      /^\s*log\s+.+\s+with\s+.+$/i
    ];

    for (const pattern of macroLogPatterns) {
      if (pattern.test(text)) {
        return {
          target: 'macro',
          confidence: 1.0,
          reason: 'macro.logging - unconsumed payload exists'
        };
      }
    }
  }

  // ========================================================================
  // Priority 2: Macro Question (informational)
  // ========================================================================
  const macroQuestionPatterns = [
    /(macros? of|calories? of|nutrition of)/i,
    /\b(tell\s+me|what\s+are|how\s+many)\s+(the\s+)?(macros?|calories?|nutrition)\s+(of|for|in)\b/i,
    /\b(macros?|calories?|nutrition)\s+(of|for|in)\s+/i
  ];

  for (const pattern of macroQuestionPatterns) {
    if (pattern.test(text)) {
      return {
        target: 'macro',
        confidence: 0.95,
        reason: 'macro.question - informational query'
      };
    }
  }

  // ========================================================================
  // Priority 3: TMWYA (direct meal logging)
  // ========================================================================
  const tmwyaPatterns = [
    /^\s*(i ate|i had|i just ate|i just had)/i,
    /\b(for (breakfast|lunch|dinner|snack))\b/i,
    /\b(ate|had|consumed|finished)\s+\d/i, // "ate 3 eggs"
    /\b(log|add|save|record)\s+.+\s+(to|for)\s+(breakfast|lunch|dinner|snack)/i
  ];

  for (const pattern of tmwyaPatterns) {
    if (pattern.test(text)) {
      return {
        target: 'tmwya',
        confidence: 0.9,
        reason: 'tmwya - direct meal logging with context'
      };
    }
  }

  // ========================================================================
  // Priority 4: MMB (feedback/bugs)
  // ========================================================================
  const mmbPatterns = RULES.MMB_ROUTER.patterns;
  for (const keyword of mmbPatterns) {
    if (text.includes(keyword)) {
      return {
        target: 'mmb',
        confidence: 0.85,
        reason: 'mmb - feedback/bug/feature request'
      };
    }
  }

  // ========================================================================
  // Default: Persona (general conversation)
  // ========================================================================
  return {
    target: 'persona',
    confidence: 0.7,
    reason: 'persona - general conversation'
  };
}

/**
 * Check if there's an unconsumed macro payload in session
 * (Call this before routing)
 */
export async function checkUnconsumedMacroPayload(
  sessionId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return false;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/macro_get_unconsumed_payload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({
          p_session_id: sessionId,
          p_user_id: userId
        })
      }
    );

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return payload !== null && typeof payload === 'object';
  } catch (error) {
    console.error('[router] Failed to check unconsumed payload:', error);
    return false;
  }
}
