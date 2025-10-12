/**
 * Intent Classifier (Swarm 2.2)
 *
 * Pure classification - identifies WHAT the user wants, not HOW to do it.
 * No food extraction, no nutrition calculation - that's the role swarm's job.
 */

import { callChat } from '../chat';

export type IntentType =
  | 'food_question'       // "what are the macros of X?"
  | 'food_mention'        // "I ate X"
  | 'food_log_followup'   // "log", "log that"
  | 'food_correction'     // "use raw", "make it medium"
  | 'kpi_query'           // "how much left today?"
  | 'undo_meal'           // "undo last meal"
  | 'workout_mention'     // "I did 3x10 bench"
  | 'workout_question'    // "how many calories does running burn?"
  | 'general';            // everything else

export interface IntentResult {
  intent: IntentType;
  confidence: number;
  rawText: string;
  metadata?: {
    timePhrase?: string;       // "for breakfast", "at 2pm"
    negation?: boolean;         // "I didn't eat", "ignore that"
    correctionPhrase?: string;  // "use raw", "make it dry"
  };
}

/**
 * Classify user intent (pure classification, no extraction)
 */
export async function classifyIntent(userMessage: string): Promise<IntentResult> {
  const trimmed = userMessage.trim().toLowerCase();

  // 1. Escape hatch
  if (userMessage.includes('#no-log')) {
    return {
      intent: 'general',
      confidence: 1.0,
      rawText: userMessage
    };
  }

  // 2. High-confidence regex patterns (no LLM needed)
  const patterns: Record<string, RegExp> = {
    food_question: /(tell me|what (are|is)|how many|show me|give me).*(macro|calorie|kcal|nutrition|protein|carb|fat)/i,
    food_log_followup: /^(log|save|record)(\s+(that|it|this))?$/i,
    undo_meal: /^undo(\s+(last(\s+meal)?|that))?$/i,
    kpi_query: /^(how\s+(much|many))?.*(left|remaining).*(today|now)/i
  };

  for (const [intent, pattern] of Object.entries(patterns)) {
    if (pattern.test(trimmed)) {
      console.log(`[intentClassifier] High-confidence match: ${intent} (regex)`);
      return {
        intent: intent as IntentType,
        confidence: 0.95,
        rawText: userMessage
      };
    }
  }

  // 3. Check for correction patterns
  const CORRECTION_PATTERNS = [
    /use\s+(raw|dry|cooked)/i,
    /make\s+it\s+(raw|dry|cooked|small|medium|large)/i,
    /change\s+to\s+(small|medium|large)/i,
    /use\s+(dry|cooked)/i
  ];

  for (const pattern of CORRECTION_PATTERNS) {
    if (pattern.test(userMessage)) {
      return {
        intent: 'food_correction',
        confidence: 0.95,
        rawText: userMessage,
        metadata: {
          correctionPhrase: userMessage.match(pattern)?.[0]
        }
      };
    }
  }

  // 4. Use LLM for ambiguous cases (classification only, no extraction)
  const llmResult = await callChat([
    {
      role: 'system',
      content: `Classify user intent. Respond ONLY with JSON:
{
  "intent": "food_question" | "food_mention" | "workout_mention" | "workout_question" | "general",
  "confidence": 0.0-1.0,
  "metadata": {
    "timePhrase": "extracted time phrase if present",
    "negation": true if user is negating/correcting
  }
}

Guidelines:
- food_question: "what are macros of X", "how many calories in X", "tell me about X"
- food_mention: "I ate X", "I had X", "just finished X", "for breakfast I ate X"
- workout_mention: "I did X", "just finished X workout"
- workout_question: "how many calories does X burn"
- general: greetings, questions about app, general chat

DO NOT extract food items. Only classify intent.
DO NOT calculate macros. Only identify what the user wants.`
    },
    {
      role: 'user',
      content: userMessage
    }
  ], {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_output_tokens: 200,
    response_format: 'json'
  });

  if (!llmResult.ok || !llmResult.content) {
    console.error('[intentClassifier] LLM call failed:', llmResult.error);
    return {
      intent: 'general',
      confidence: 0.0,
      rawText: userMessage
    };
  }

  try {
    const parsed = typeof llmResult.content === 'string'
      ? JSON.parse(llmResult.content)
      : llmResult.content;

    return {
      intent: parsed.intent || 'general',
      confidence: parsed.confidence || 0.5,
      rawText: userMessage,
      metadata: parsed.metadata
    };
  } catch (error: any) {
    console.error('[intentClassifier] Parse error:', error);
    return {
      intent: 'general',
      confidence: 0.0,
      rawText: userMessage
    };
  }
}
