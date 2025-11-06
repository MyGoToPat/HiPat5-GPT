/**
 * Shared Meal NLU Parser
 * Single source of truth for parsing meal descriptions
 * Used by both Macro and TMWYA swarms
 */

import { z } from 'zod';
// PROMPTS definition (inline to avoid missing config dependency)
const PROMPTS = {
  SHARED_MACRO_NLU: `Parse meal descriptions into structured food items.

Return JSON: {"items":[{"name":"food name","qty":number,"unit":"piece|cup|g|oz|etc","brand":null,"prep_method":null,"originalText":"original text"}]}

Rules:
- Split on "and", commas
- Extract quantities and units
- Preserve exact food names
- Default unit: piece for countable foods, cup for measured foods`
};

// Zod schemas for validation
export const MealItemSchema = z.object({
  name: z.string().min(1),
  qty: z.number().positive(),
  unit: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  prep_method: z.string().nullable().optional(),
  originalText: z.string()
});

export const MealParseSchema = z.object({
  items: z.array(MealItemSchema).min(1),
  meal_slot: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable().optional()
});

export type MealItem = z.infer<typeof MealItemSchema>;
export type MealParse = z.infer<typeof MealParseSchema>;

/**
 * Parse meal description into structured format
 * @param text User's meal description
 * @returns Validated MealParse object
 */
export async function parseMeal(text: string): Promise<MealParse> {
  try {
    // Call OpenAI with SHARED_MACRO_NLU prompt
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-chat`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: PROMPTS.SHARED_MACRO_NLU },
            { role: 'user', content: text }
          ],
          temperature: 0.1,
          max_tokens: 400,
          response_format: { type: 'json_object' }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`NLU parse failed: ${response.statusText}`);
    }

    const data = await response.json();
    const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;

    // Validate with Zod
    return MealParseSchema.parse(parsed);
  } catch (error) {
    console.error('[meal-nlu] Parse error:', error);

    // Fallback: treat entire text as single item
    return {
      items: [{
        name: text,
        qty: 1,
        unit: null,
        brand: null,
        prep_method: null,
        originalText: text
      }],
      meal_slot: null
    };
  }
}

/**
 * Deterministic local parser (no LLM) for simple patterns
 * Used when LLM unavailable or for testing
 */
export function parseMealLocal(text: string): MealParse {
  const cleanText = text
    .replace(/^(macros? of|calories? of|what are the macros? for|tell me the macros? of)\s+/i, '')
    .replace(/^(i ate|i had|for (breakfast|lunch|dinner|snack))\s+/i, '')
    .trim();

  // Split on separators
  const separators = /\s+and\s+|\s+with\s+|,\s*/i;
  const parts = cleanText.split(separators).filter(p => p.trim().length > 0);

  const items: MealItem[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Parse "qty unit name" or "qty name" or just "name"
    // Support fractions: "1/2 cup oatmeal"
    const qtyMatch = trimmed.match(/^(\d+(?:\/\d+)?)\s+([a-z]+\s+)?(.+)$/i);

    if (qtyMatch) {
      let qty = 1;
      const qtyStr = qtyMatch[1];

      // Handle fractions
      if (qtyStr.includes('/')) {
        const [num, den] = qtyStr.split('/').map(Number);
        qty = num / den;
      } else {
        qty = parseFloat(qtyStr);
      }

      const unit = qtyMatch[2]?.trim() || null;
      const name = qtyMatch[3].trim();

      items.push({
        name,
        qty,
        unit,
        brand: null,
        prep_method: null,
        originalText: trimmed
      });
    } else {
      // No quantity found, default to 1
      items.push({
        name: trimmed,
        qty: 1,
        unit: null,
        brand: null,
        prep_method: null,
        originalText: trimmed
      });
    }
  }

  return {
    items: items.length > 0 ? items : [{
      name: cleanText || text,
      qty: 1,
      unit: null,
      brand: null,
      prep_method: null,
      originalText: text
    }],
    meal_slot: null
  };
}
