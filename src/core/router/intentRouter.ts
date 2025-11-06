/**
 * INTENT ROUTER
 * Personality Router (LLM-aware) → Quick regex hits → Low-cost classifier
 */

import { runPersonalityRouter, normalizeIntent } from '../personality/routerAgent';

export interface IntentResult {
  intent: string;
  confidence: number;
  metadata?: Record<string, any>;
}

const QUICK_HIT_PATTERNS = [
  // CRITICAL: Order matters - more specific patterns first
  { pattern: /\b(what are the macros?|what are macros?|macros for|nutrition for)\b/i, intent: 'food_question' },
  { pattern: /\bi ate\b/i, intent: 'food_log' },
  { pattern: /\bi had\b/i, intent: 'food_log' },
  { pattern: /\b(log|save|record)\b/i, intent: 'food_log' },
  { pattern: /\b(undo|delete|remove)\s+(last|that)/i, intent: 'food_undo' },
  { pattern: /\b(how much|remaining|left)\b.*\b(calories|protein|carbs|fat|fiber)\b/i, intent: 'kpi_remaining' },
  { pattern: /\b(today'?s?|daily)\s+(summary|kpis?|totals?|macros?)\b/i, intent: 'kpi_today' },
] as const;

/**
 * Fast pattern matching for common intents
 */
function quickHit(message: string): IntentResult | null {
  for (const { pattern, intent } of QUICK_HIT_PATTERNS) {
    if (pattern.test(message)) {
      return {
        intent,
        confidence: 0.95, // High confidence for regex matches
        metadata: { method: 'regex' }
      };
    }
  }
  return null;
}

/**
 * Low-cost classifier using lightweight model
 */
async function classifyIntent(message: string): Promise<IntentResult> {
  // TODO: Implement actual LLM call to gemini-flash or gpt-4o-mini
  // For now, return general intent with low confidence

  // Placeholder logic - will be replaced with actual LLM call
  const lowerMessage = message.toLowerCase().trim();

  // Greetings should use general chat (which routes to OpenAI for personality)
  if (/^(hey|hi|hello|sup|yo|howdy)$/i.test(lowerMessage)) {
    return {
      intent: 'general',
      confidence: 0.95,
      metadata: { method: 'greeting', use_openai: true }
    };
  }

  if (lowerMessage.includes('macro') || lowerMessage.includes('nutrition') || lowerMessage.includes('calories')) {
    return {
      intent: 'food_question',
      confidence: 0.7,
      metadata: { method: 'classifier_placeholder' }
    };
  }

  if (lowerMessage.includes('kpi') || lowerMessage.includes('today') || lowerMessage.includes('progress')) {
    return {
      intent: 'kpi_today',
      confidence: 0.7,
      metadata: { method: 'classifier_placeholder' }
    };
  }

  return {
    intent: 'general',
    confidence: 0.5,
    metadata: { method: 'classifier_placeholder' }
  };
}

/**
 * Detect web search intent from message
 */
function detectWebIntent(message: string): { needs_web: boolean; wants_links: boolean; freshness_days?: number; depth: 'brief' | 'detailed' } {
  const lower = message.toLowerCase();
  
  const needs_web = /\b(search|find|latest|link|links|cite|sources|up[- ]to[- ]date|news|study|paper|current|recent)\b/.test(lower);
  const wants_links = /\b(link|links|cite|sources|url|website)\b/.test(lower);
  const freshness_days = /\b(today|this week|this month|this year|latest|new|2024|2025)\b/.test(lower) ? 365 : undefined;
  const depth = /\b(detailed|deep|thorough|long|comprehensive|extensive)\b/.test(lower) ? 'detailed' as const : 'brief' as const;
  
  return { needs_web, wants_links, freshness_days, depth };
}

/**
 * Main intent detection entry point
 * Tries Personality Router first (LLM-aware), falls back to regex/classifier
 * @param routerDecision Optional router decision to avoid duplicate calls
 */
export async function detectIntent(message: string, routerDecision?: import('../personality/routerAgent').RouterDecision | null): Promise<IntentResult> {
  // ✅ Step 1: Try Personality Router first (LLM-aware intelligent routing)
  let decision = routerDecision;
  
  if (!decision) {
    try {
      decision = await runPersonalityRouter(message);
    } catch (e) {
      console.warn('[intentRouter] Personality router failed, falling back', e);
    }
  }
  
  if (decision && decision.confidence >= 0.6) {
    console.info('[intentRouter] Personality router decision', decision);
    
    // Map router route_to to intent format with normalization
    let intent: string;
    const normalizedRoute = normalizeIntent(decision.route_to);
    if (normalizedRoute === 'tmwya' || normalizedRoute === 'meal_logging') {
      intent = 'food_question';
    } else if (normalizedRoute === 'workout') {
      intent = 'workout';
    } else if (normalizedRoute === 'camera') {
      intent = 'camera';
    } else {
      intent = 'general';
    }

    const webIntent = detectWebIntent(message);
    
    return {
      intent,
      confidence: decision.confidence,
      metadata: {
        method: 'personality_router',
        route_to: decision.route_to,
        use_gemini: decision.use_gemini,
        reason: decision.reason,
        needs_clarification: decision.needs_clarification,
        clarifier: decision.clarifier,
        needs_web: webIntent.needs_web,
        wants_links: webIntent.wants_links,
        freshness_days: webIntent.freshness_days,
        depth: webIntent.depth
      }
    };
  }

  // ✅ Step 2: Fallback to quick regex hits
  const quickResult = quickHit(message);
  if (quickResult) {
    // ✅ Check for web intent even in quick hits
    const webIntent = detectWebIntent(message);
    if (webIntent.needs_web) {
      return {
        ...quickResult,
        metadata: {
          ...quickResult.metadata,
          needs_web: true,
          wants_links: webIntent.wants_links,
          freshness_days: webIntent.freshness_days,
          depth: webIntent.depth
        }
      };
    }
    return quickResult;
  }

  // ✅ Step 3: Fall back to classifier
  const classifierResult = await classifyIntent(message);

  // ✅ Check for web intent in classifier result
  const webIntent = detectWebIntent(message);
  if (webIntent.needs_web) {
    return {
      intent: classifierResult.intent || 'general',
      confidence: Math.max(classifierResult.confidence, 0.7), // Boost confidence if web keywords present
      metadata: {
        ...classifierResult.metadata,
        needs_web: true,
        wants_links: webIntent.wants_links,
        freshness_days: webIntent.freshness_days,
        depth: webIntent.depth
      }
    };
  }

  // If classifier confidence is too low, default to general
  if (classifierResult.confidence < 0.6) {
    return {
      intent: 'general',
      confidence: 0.8,
      metadata: { ...classifierResult.metadata, fallback: true }
    };
  }

  return classifierResult;
}

/**
 * Check if intent should trigger a role
 */
export function shouldTriggerRole(intent: string): boolean {
  const roleIntents = [
    'food_question',
    'food_log',
    'food_undo',
    'kpi_today',
    'kpi_remaining',
  ];

  return roleIntents.includes(intent);
}
