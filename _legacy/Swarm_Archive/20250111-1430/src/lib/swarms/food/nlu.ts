/**
 * Food NLU (Natural Language Understanding) Agent
 *
 * Extracts food entities from natural language text.
 * Does NOT calculate macros - that's the resolver's job.
 */

import { callChat } from '../../chat';

export interface FoodEntity {
  name: string;           // "ribeye", "eggs", "oatmeal"
  quantity: number;       // 10, 3, 1
  unit: string;          // "oz", "whole", "cup"
  qualifiers?: string[]; // ["large", "cooked", "raw"]
}

/**
 * Extract food entities from text using LLM
 */
export async function extractFoodEntities(text: string): Promise<FoodEntity[]> {
  const result = await callChat([
    {
      role: 'system',
      content: `Extract food items from text. Return JSON array:
[
  {
    "name": "food name (normalized, lowercase)",
    "quantity": number,
    "unit": "standard unit",
    "qualifiers": ["size/prep modifiers"] (optional)
  }
]

Unit normalization:
- "oz" for ounces
- "g" for grams
- "cup" for cups
- "tbsp" for tablespoons
- "tsp" for teaspoons
- "whole" for whole items (eggs, apples, etc.)
- "slices" for sliced items
- "medium", "large", "small" for sizes

Qualifier examples:
- Size: "large", "medium", "small"
- Prep: "cooked", "raw", "steamed", "fried"
- Cut: "chopped", "diced", "whole"

Examples:
"10oz ribeye" → {"name": "ribeye steak", "quantity": 10, "unit": "oz", "qualifiers": []}
"3 whole large eggs" → {"name": "eggs", "quantity": 3, "unit": "whole", "qualifiers": ["large"]}
"one cup of oatmeal" → {"name": "oatmeal", "quantity": 1, "unit": "cup", "qualifiers": []}
"1/2 cup skim milk" → {"name": "skim milk", "quantity": 0.5, "unit": "cup", "qualifiers": []}

CRITICAL:
- DO NOT calculate macros or calories
- DO NOT infer prep state unless explicitly stated
- DO return empty array if no food items found`
    },
    {
      role: 'user',
      content: text
    }
  ], {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.1,
    max_output_tokens: 500,
    response_format: 'json'
  });

  if (!result.ok || !result.content) {
    console.error('[extractFoodEntities] LLM call failed:', result.error);
    return [];
  }

  try {
    const parsed = typeof result.content === 'string'
      ? JSON.parse(result.content)
      : result.content;

    // Handle both array and object with array property
    const entities = Array.isArray(parsed) ? parsed : (parsed.items || []);

    return entities.map((item: any) => ({
      name: item.name || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      qualifiers: item.qualifiers || []
    }));
  } catch (error: any) {
    console.error('[extractFoodEntities] Parse error:', error);
    return [];
  }
}
