import { corsHeaders } from './_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TMWYARequest {
  userMessage: string;
  userId: string;
  source?: 'text' | 'voice' | 'photo' | 'barcode';
}

interface TMWYAResponse {
  ok: boolean;
  items?: Array<{
    name: string;
    grams: number;
    macros: {
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
    confidence: number;
    originalText: string;
  }>;
  meal_slot?: string;
  error?: string;
  step?: string;
}

/**
 * TMWYA Edge Function
 *
 * Uses personality agents from registry to process meal input.
 * Integrates with Pat's personality orchestrator for consistent experience.
 *
 * Flow:
 * 1. Intent Router - Classify input type
 * 2. Utterance Normalizer - Clean dictation errors
 * 3. Meal NLU Parser - Extract food items
 * 4. Macro Calculator - Get nutrition data
 * 5. Return structured data for verification
 */

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { userMessage, userId, source = 'text' }: TMWYARequest = await req.json();

    if (!userMessage || !userId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing userMessage or userId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'OpenAI API key not configured', step: 'config' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[TMWYA] Processing meal input:', { userId, source, messageLength: userMessage.length });

    // Step 1: Parse the meal input using Meal NLU Parser agent
    const parseResult = await parseMealInput(userMessage, openaiApiKey);

    if (!parseResult.ok || !parseResult.items || parseResult.items.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'No food items detected in input',
          step: 'parsing'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[TMWYA] Parsed items:', parseResult.items.length);

    // Step 2: Resolve each food item and get macros
    const resolvedItems = await Promise.all(
      parseResult.items.map(async (item) => {
        const macros = await resolveFoodMacros(item.name, openaiApiKey);

        return {
          name: item.name,
          grams: calculateGrams(item.qty || 1, item.unit || 'serving'),
          macros: macros || { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
          confidence: macros ? 0.8 : 0.3,
          originalText: item.originalText || item.name,
        };
      })
    );

    console.log('[TMWYA] Resolved items:', resolvedItems.length);

    // Return structured result for verification screen
    const response: TMWYAResponse = {
      ok: true,
      items: resolvedItems,
      meal_slot: parseResult.meal_slot || determineMealSlot(),
      step: 'verification_ready'
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[TMWYA] Error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || 'Internal server error',
        step: 'unknown'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Parse meal input using NLU agent prompt
 */
async function parseMealInput(
  message: string,
  apiKey: string
): Promise<{
  ok: boolean;
  items?: Array<{
    name: string;
    qty?: number;
    unit?: string;
    brand?: string;
    prep_method?: string;
    originalText: string;
  }>;
  meal_slot?: string;
  confidence?: number;
  error?: string;
}> {
  const systemPrompt = `Parse food items from this meal description.

EXTRACT:
- name: Food item name
- qty: Numeric quantity (if specified)
- unit: Unit of measurement (g, oz, cup, piece, serving)
- brand: Brand name (if mentioned)
- prep_method: Cooking method (grilled, fried, raw, baked)

RULES:
- Split compound items: "burger and fries" → 2 items
- Default qty to 1 if not specified
- Default unit to "serving" if not specified
- Detect meal slot from time/context (breakfast, lunch, dinner, snack)

OUTPUT JSON:
{
  "items": [{"name": "string", "qty": 1, "unit": "serving", "brand": "", "prep_method": "", "originalText": "string"}],
  "meal_slot": "breakfast|lunch|dinner|snack|unknown",
  "confidence": 0.8
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      console.error('[TMWYA] OpenAI parse error:', await response.text());
      return { ok: false, error: 'Failed to parse meal input' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { ok: false, error: 'No response from parser' };
    }

    const parsed = JSON.parse(content);
    return { ok: true, ...parsed };
  } catch (error) {
    console.error('[TMWYA] Parse error:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Resolve food item to macros using Macro Calculator agent prompt
 */
async function resolveFoodMacros(
  foodName: string,
  apiKey: string
): Promise<{ kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null> {
  const prompt = `Return nutrition facts per 100g for: ${foodName.trim()} as typically prepared in North America.

OUTPUT JSON with these exact keys:
{
  "kcal": <number>,
  "protein_g": <number>,
  "carbs_g": <number>,
  "fat_g": <number>
}

If you cannot provide a reasonable estimate, respond with {"error": "unconfident"}.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a nutrition expert. Always respond with valid JSON only. No additional text or explanations.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('[TMWYA] OpenAI macros error:', await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    const macros = JSON.parse(content.trim());

    if (macros.error === 'unconfident') {
      return null;
    }

    return {
      kcal: Number(macros.kcal) || 0,
      protein_g: Number(macros.protein_g) || 0,
      carbs_g: Number(macros.carbs_g) || 0,
      fat_g: Number(macros.fat_g) || 0,
    };
  } catch (error) {
    console.error('[TMWYA] Macro resolution error:', error);
    return null;
  }
}

/**
 * Calculate grams from quantity + unit
 */
function calculateGrams(qty: number, unit: string): number {
  const unitLower = unit.toLowerCase();

  const conversions: Record<string, number> = {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'oz': 28.35,
    'ounce': 28.35,
    'lb': 453.59,
    'pound': 453.59,
    'cup': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tsp': 5,
    'teaspoon': 5,
    'piece': 100,
    'serving': 100,
    'slice': 30,
    'egg': 50,
    'banana': 120,
    'apple': 180
  };

  return (conversions[unitLower] || 100) * qty;
}

/**
 * Determine meal slot based on current time
 */
function determineMealSlot(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}
