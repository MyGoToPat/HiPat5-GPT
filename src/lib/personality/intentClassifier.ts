/**
 * Multi-Intent Classifier (Swarm 2.1)
 * Extends food classification with KPI, log_that, undo, and general intents
 */

import { callChat } from '../chat';

export type IntentType =
  | 'food_mention'
  | 'food_question'
  | 'kpi_question'
  | 'log_that'
  | 'undo'
  | 'workout_mention'
  | 'workout_question'
  | 'general';

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

export type Classified =
  | { intent: 'food_mention'; items: FoodItem[]; confidence: number }
  | { intent: 'food_question'; items: FoodItem[]; confidence: number }
  | { intent: 'kpi_question'; confidence: number }
  | { intent: 'log_that'; confidence: number }
  | { intent: 'undo'; confidence: number }
  | { intent: 'workout_mention'; confidence: number }
  | { intent: 'workout_question'; confidence: number }
  | { intent: 'general'; reply?: string; confidence: number };

/**
 * Classify user message across multiple intent types
 */
export async function intentClassifier(userMessage: string): Promise<Classified> {
  // 1. Check #no-log escape hatch
  if (userMessage.includes('#no-log')) {
    return {
      intent: 'general',
      reply: userMessage.replace('#no-log', '').trim(),
      confidence: 1.0
    };
  }

  // 2. Check log follow-up pattern (accepts "log", "log that", "save it", etc.)
  const LOG_FOLLOWUP_RE = /^(log|save|record)(\s+(that|it|this))?$/i;
  if (LOG_FOLLOWUP_RE.test(userMessage.trim())) {
    return { intent: 'log_that', confidence: 0.95 };
  }

  // 3. Check "undo" pattern (high-confidence regex)
  const undoPattern = /undo\s+(last\s+meal|that|last)/i;
  if (undoPattern.test(userMessage.trim())) {
    return { intent: 'undo', confidence: 0.95 };
  }

  // 4. Check KPI question patterns (high-confidence regex)
  const kpiPatterns = [
    /how\s+much.*(left|remaining).*today/i,
    /how\s+many.*(left|remaining)/i,
    /(calories|kcal|macros).*(left|remaining)/i,
    /what.*(left|remaining).*today/i
  ];

  if (kpiPatterns.some(p => p.test(userMessage))) {
    return { intent: 'kpi_question', confidence: 0.9 };
  }

  // 5. Use LLM for complex classification (food + workout + general)
  const classificationPrompt = `You are a nutrition and fitness assistant. Classify this message.

User message: "${userMessage}"

Classify as ONE of these types:

1. "food_mention" - User is describing food they ate or want to log
   Examples: "I had bacon and eggs", "just ate 10oz ribeye", "2 eggs"

   Extract each item with: name, quantity, unit, energy_kcal, protein_g, fat_g, carbs_g, fiber_g

2. "food_question" - User asking about food/nutrition but NOT logging
   Examples: "How many calories in ribeye?", "What are macros for oatmeal?"

   Extract hypothetical items with estimated macros

3. "workout_mention" - User describing a workout they did (future feature)
   Examples: "I did 3x10 bench press", "ran 5 miles"

4. "workout_question" - User asking about workouts (future feature)
   Examples: "How many calories does running burn?"

5. "general" - Anything else
   Examples: "How are you?", "Tell me about features"

Respond in JSON:
{
  "type": "food_mention" | "food_question" | "workout_mention" | "workout_question" | "general",
  "confidence": 0.0 to 1.0,
  "items": [ /* Only for food_mention or food_question */
    {
      "name": "bacon",
      "quantity": 2,
      "unit": "slices",
      "energy_kcal": 86,
      "protein_g": 6,
      "fat_g": 7,
      "carbs_g": 0,
      "fiber_g": 0
    }
  ],
  "response": "brief answer" /* Only for food_question */
}`;

  try {
    const result = await callChat(
      [{ role: 'user', content: classificationPrompt }],
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_output_tokens: 1000,
        response_format: 'json',
        json_schema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['food_mention', 'food_question', 'workout_mention', 'workout_question', 'general']
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number' },
                  unit: { type: 'string' },
                  energy_kcal: { type: 'number' },
                  protein_g: { type: 'number' },
                  fat_g: { type: 'number' },
                  carbs_g: { type: 'number' },
                  fiber_g: { type: 'number' }
                },
                required: ['name', 'quantity', 'unit', 'energy_kcal', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g']
              }
            },
            response: { type: 'string' }
          },
          required: ['type', 'confidence']
        }
      }
    );

    if (!result.ok || !result.content) {
      console.error('[intentClassifier] LLM call failed:', result.error);
      return { intent: 'general', confidence: 0.0 };
    }

    const parsed = typeof result.content === 'string'
      ? JSON.parse(result.content)
      : result.content;

    // Map LLM response to intent types
    const intentType = parsed.type as IntentType;
    const confidence = parsed.confidence || 0.0;

    switch (intentType) {
      case 'food_mention':
        return {
          intent: 'food_mention',
          items: parsed.items || [],
          confidence
        };

      case 'food_question':
        return {
          intent: 'food_question',
          items: parsed.items || [],
          confidence
        };

      case 'workout_mention':
        return { intent: 'workout_mention', confidence };

      case 'workout_question':
        return { intent: 'workout_question', confidence };

      case 'general':
      default:
        return {
          intent: 'general',
          reply: parsed.response,
          confidence
        };
    }

  } catch (error: any) {
    console.error('[intentClassifier] Classification error:', error);
    return { intent: 'general', confidence: 0.0 };
  }
}
