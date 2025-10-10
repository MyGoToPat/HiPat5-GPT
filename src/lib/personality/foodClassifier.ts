/**
 * Simplified Food Message Classifier
 * 3-class system: food_mention, food_question, general
 * LLM does the interpretation; no button required
 */

import { callChat } from '../chat';

export type FoodClassification = 'food_mention' | 'food_question' | 'general';

export interface ExtractedFoodItem {
  name: string;
  quantity: number;
  unit: string;
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

export interface ClassificationResult {
  type: FoodClassification;
  items?: ExtractedFoodItem[];
  response?: string;
  confidence: number;
}

/**
 * Classify user message and extract food items if applicable
 * Uses LLM for natural interpretation - no rigid patterns required
 */
export async function classifyFoodMessage(
  userMessage: string,
  context?: {
    buttonPressed?: string;  // Optional hint, not required
    userId?: string;
  }
): Promise<ClassificationResult> {

  // Check for #no-log escape hatch (UX guardrail)
  if (userMessage.includes('#no-log')) {
    return {
      type: 'general',
      confidence: 1.0,
      response: userMessage.replace('#no-log', '').trim()
    };
  }

  // Build classification prompt for LLM
  const classificationPrompt = `You are a food logging assistant. Classify this message and extract food items if applicable.

User message: "${userMessage}"

Classify as ONE of these types:

1. "food_mention" - User is describing food they ate or want to log
   Examples:
   - "I had two slices of bacon and two eggs"
   - "Just ate 10oz ribeye"
   - "2 eggs, 3 strips bacon"
   - "logged oatmeal for breakfast"

   For food_mention, extract each item with:
   - name (string)
   - quantity (number)
   - unit (string like "slices", "cups", "oz", "each")
   - Estimate macros per item (energy_kcal, protein_g, fat_g, carbs_g, fiber_g)

2. "food_question" - User is asking about food/nutrition but NOT logging
   Examples:
   - "How many calories in 10oz ribeye?"
   - "What are the macros for oatmeal?"
   - "Is chicken high in protein?"

3. "general" - Anything else
   Examples:
   - "How are you?"
   - "Tell me about your features"
   - General conversation

Respond in JSON:
{
  "type": "food_mention" | "food_question" | "general",
  "confidence": 0.0 to 1.0,
  "items": [ // Only if type is food_mention
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
  "response": "brief answer text" // Only if type is food_question
}`;

  try {
    const result = await callChat(
      [{ role: 'user', content: classificationPrompt }],
      {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.3,  // Lower temperature for consistent classification
        max_output_tokens: 1000,
        response_format: 'json',
        json_schema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['food_mention', 'food_question', 'general']
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
      console.error('[foodClassifier] LLM call failed:', result.error);
      // Fallback to general classification
      return {
        type: 'general',
        confidence: 0.0
      };
    }

    const parsed = typeof result.content === 'string'
      ? JSON.parse(result.content)
      : result.content;

    // Validate and return
    return {
      type: parsed.type || 'general',
      items: parsed.items || undefined,
      response: parsed.response || undefined,
      confidence: parsed.confidence || 0.0
    };

  } catch (error: any) {
    console.error('[foodClassifier] Classification error:', error);
    // Fallback to general on error
    return {
      type: 'general',
      confidence: 0.0
    };
  }
}
