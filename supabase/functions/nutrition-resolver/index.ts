import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface NutritionRequest {
  // Single-item mode (backward compatible)
  foodName?: string;
  useCache?: boolean;
  // Batch mode
  items?: Array<{
    name: string;
    qty: number;
    unit: string;
    brand?: string;
    basis?: string;
  }>;
}

interface MacroResponse {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;  // NEW: Dietary fiber in grams
  confidence: number;
  source: string;
  basis: string;
}

interface BatchItemResponse {
  name: string;
  qty: number;
  unit: string;
  grams_used: number;
  basis_used: string;
  macros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
}

interface BatchResponse {
  items: BatchItemResponse[];
}

// Centralized unit conversions
function convertToGrams(qty: number, unit: string, foodName: string): number {
  const unitLower = unit.toLowerCase();
  const foodNameLower = foodName.toLowerCase();

  // Special cases based on food name
  if (unitLower === 'large' && foodNameLower.includes('egg')) return qty * 50;
  if ((unitLower === 'slice' || unitLower === 'slices') && foodNameLower.includes('bacon')) return qty * 10;
  if ((unitLower === 'slice' || unitLower === 'slices') && (foodNameLower.includes('bread') || foodNameLower.includes('sourdough'))) return qty * 50;

  // Weight-based units
  const conversions: Record<string, number> = {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'oz': 28.35,
    'ounce': 28.35,
    'ounces': 28.35,
    'lb': 453.59,
    'pound': 453.59,
    'pounds': 453.59,
    'kg': 1000,
    // Volume (approximate for solids)
    'cup': 240,
    'cups': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tsp': 5,
    'teaspoon': 5,
    // Count-based defaults
    'serving': 100,
    'piece': 100,
    'item': 100,
  };

  return (conversions[unitLower] || 100) * qty;
}

// Resolve single food item (shared by single and batch modes)
async function resolveSingleFood(
  foodName: string,
  supabase: any,
  openaiApiKey: string,
  useCache: boolean = true
): Promise<MacroResponse> {
  const normalizedFood = foodName.trim().toLowerCase();

  // Step 1: Check cache
  if (useCache) {
    const { data: cached, error: cacheError } = await supabase
      .from('portion_defaults')
      .select('*')
      .eq('food_name', normalizedFood)
      .maybeSingle();

    if (cached && !cacheError) {
      console.log('[Nutrition Resolver] Cache HIT:', normalizedFood);
      return {
        kcal: Number(cached.kcal),
        protein_g: Number(cached.protein_g),
        carbs_g: Number(cached.carbs_g),
        fat_g: Number(cached.fat_g),
        fiber_g: Number(cached.fiber_g || 0),
        confidence: Number(cached.confidence),
        source: cached.source,
        basis: cached.basis
      };
    }
  }

  console.log('[Nutrition Resolver] Cache MISS:', normalizedFood);

  // Step 2: Check if branded/restaurant food
  const isBrandedFood = /big mac|whopper|quarter pounder|mcdonalds|burger king|wendys|subway|chipotle|starbucks/i.test(normalizedFood);

  const prompt = isBrandedFood
    ? `Return the actual nutrition facts for ${foodName.trim()} as served by the restaurant. Use real menu data. For example, a Big Mac is ~550kcal total, not per 100g. Respond as JSON with keys: kcal, protein_g, carbs_g, fat_g, fiber_g (dietary fiber in grams; use 0 if unavailable) for the ENTIRE item as served.`
    : `Return the nutrition facts per 100g for COOKED ${foodName.trim()}. Default to cooked unless explicitly stated as raw. For example, cooked chicken breast is ~165kcal/100g, cooked/boiled egg is ~155kcal/100g. Respond as JSON with keys: kcal, protein_g, carbs_g, fat_g, fiber_g (dietary fiber in grams; use 0 if unavailable or negligible). Use USDA database values for COOKED ingredients. If unsure, state your best guess based on USDA COOKED values. If you cannot provide a reasonable estimate, respond with a JSON object containing a single key 'error' with value 'unconfident'.`;

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a nutrition expert. Always respond with valid JSON only. No additional text or explanations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!openaiResponse.ok) {
    const errorData = await openaiResponse.text();
    console.error('[Nutrition Resolver] OpenAI API error:', errorData);
    throw new Error('Unable to fetch nutrition data right now');
  }

  const openaiData = await openaiResponse.json();
  const assistantMessage = openaiData.choices?.[0]?.message?.content;

  if (!assistantMessage) {
    throw new Error('No response from nutrition service');
  }

  let macroData: MacroResponse | { error: string };
  try {
    macroData = JSON.parse(assistantMessage.trim());
  } catch (parseError) {
    console.error('[Nutrition Resolver] Failed to parse OpenAI response:', assistantMessage);
    throw new Error('Invalid response format from nutrition service');
  }

  if ('error' in macroData && macroData.error === 'unconfident') {
    throw new Error('Could not find reliable nutrition data for this food');
  }

  const macro = macroData as MacroResponse;
  if (typeof macro.kcal !== 'number' || typeof macro.protein_g !== 'number' || typeof macro.carbs_g !== 'number' || typeof macro.fat_g !== 'number') {
    throw new Error('Invalid nutrition data format received');
  }

  // Ensure fiber_g defaults to 0 if not provided
  const fiber_g = typeof macro.fiber_g === 'number' ? macro.fiber_g : 0;

  // Step 3: Cache the result
  const { error: insertError } = await supabase
    .from('portion_defaults')
    .insert({
      food_name: normalizedFood,
      basis: isBrandedFood ? 'as-served' : 'cooked',
      kcal: macro.kcal,
      protein_g: macro.protein_g,
      carbs_g: macro.carbs_g,
      fat_g: macro.fat_g,
      fiber_g: fiber_g,
      confidence: 0.85,
      source: 'gpt-4o'
    })
    .select()
    .maybeSingle();

  if (insertError) {
    console.warn('[Nutrition Resolver] Failed to cache result:', insertError);
  } else {
    console.log('[Nutrition Resolver] Cached result:', normalizedFood);
  }

  return {
    kcal: macro.kcal,
    protein_g: macro.protein_g,
    carbs_g: macro.carbs_g,
    fat_g: macro.fat_g,
    fiber_g: fiber_g,
    confidence: 0.85,
    source: 'gpt-4o',
    basis: isBrandedFood ? 'as-served' : 'cooked'
  };
}

// Handle batch requests
async function handleBatchRequest(
  items: Array<{ name: string; qty: number; unit: string; brand?: string; basis?: string }>,
  useCache: boolean,
  supabase: any,
  openaiApiKey: string
): Promise<Response> {
  console.log('[Nutrition Resolver] Batch mode:', items.length, 'items');

  const results: BatchItemResponse[] = [];

  for (const item of items) {
    try {
      // Resolve per-100g macros for this food
      const perUnitMacros = await resolveSingleFood(item.name, supabase, openaiApiKey, useCache);

      // Convert quantity to grams
      const gramsUsed = convertToGrams(item.qty, item.unit, item.name);

      // Scale macros based on grams (assuming per-100g basis)
      const ratio = perUnitMacros.basis === 'as-served' ? 1 : (gramsUsed / 100);

      const scaledMacros = {
        kcal: Math.round(perUnitMacros.kcal * ratio * 10) / 10,
        protein_g: Math.round(perUnitMacros.protein_g * ratio * 10) / 10,
        carbs_g: Math.round(perUnitMacros.carbs_g * ratio * 10) / 10,
        fat_g: Math.round(perUnitMacros.fat_g * ratio * 10) / 10,
        fiber_g: Math.round(perUnitMacros.fiber_g * ratio * 10) / 10,
      };

      results.push({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        grams_used: gramsUsed,
        basis_used: perUnitMacros.basis,
        macros: scaledMacros
      });
    } catch (error) {
      console.error('[Nutrition Resolver] Error resolving item:', item.name, error);
      // Return zero macros for failed items
      results.push({
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        grams_used: 0,
        basis_used: 'unknown',
        macros: {
          kcal: 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          fiber_g: 0,
        }
      });
    }
  }

  return new Response(
    JSON.stringify({ items: results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { foodName, useCache = true, items }: NutritionRequest = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // BATCH MODE: Handle multiple items
    if (items && Array.isArray(items) && items.length > 0) {
      return await handleBatchRequest(items, useCache, supabase, openaiApiKey);
    }

    // SINGLE MODE: Handle single food item (backward compatible)
    if (!foodName || typeof foodName !== 'string' || foodName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid food name provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await resolveSingleFood(foodName, supabase, openaiApiKey, useCache);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Nutrition Resolver] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
