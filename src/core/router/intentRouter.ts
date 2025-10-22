/**
 * INTENT ROUTER
 * Quick regex hits + low-cost JSON classifier
 */

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
 * Main intent detection entry point
 */
export async function detectIntent(message: string): Promise<IntentResult> {
  // Try quick regex hits first
  const quickResult = quickHit(message);
  if (quickResult) {
    return quickResult;
  }

  // Fall back to classifier
  const classifierResult = await classifyIntent(message);

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
