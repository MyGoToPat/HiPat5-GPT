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
    qty: number;
    unit: string;
    grams: number;
    macros: {
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
    confidence: number;
    originalText: string;
    brand?: string;
  }>;
  meal_slot?: string;
  error?: string;
  step?: string;
}

/**
 * TMWYA Edge Function v2.0 - Cache-First Implementation
 *
 * Uses personality agents from registry to process meal input.
 * Integrates with Pat's personality orchestrator for consistent experience.
 *
 * Flow:
 * 1. Intent Router - Classify input type
 * 2. Utterance Normalizer - Clean dictation errors
 * 3. Meal NLU Parser - Extract food items
 * 4. Macro Calculator - Get nutrition data (CACHE FIRST, then Gemini, then GPT-4o)
 * 5. Return structured data for verification
 */

Deno.serve(async (req: Request) => {
  console.log('[TMWYA v2.0] Cache-first version starting...');

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

    // Get API keys
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'OpenAI API key not configured', step: 'config' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!geminiApiKey) {
      console.warn('[TMWYA] Gemini API key not configured - will use GPT-4o only');
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

    // Step 2: Resolve each food item and get macros (per 100g) using cache-first strategy
    const resolvedItems = await Promise.all(
      parseResult.items.map(async (item) => {
        const macroPer100g = await resolveFoodMacros(
          supabase,
          item.name,
          openaiApiKey,
          geminiApiKey,
          item.brand
        );

        if (!macroPer100g) {
          return {
            name: item.name,
            qty: item.qty || 1,
            unit: item.unit || 'serving',
            grams: calculateGrams(item.qty || 1, item.unit || 'serving'),
            macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
            confidence: 0.3,
            originalText: item.originalText || item.name,
            brand: item.brand,
          };
        }

        // Calculate grams based on qty and unit
        const totalGrams = calculateGrams(item.qty || 1, item.unit || 'serving', item.name);

        // Scale macros based on actual grams
        const ratio = totalGrams / 100;
        const scaledMacros = {
          kcal: Math.round(macroPer100g.kcal * ratio * 10) / 10,
          protein_g: Math.round(macroPer100g.protein_g * ratio * 10) / 10,
          carbs_g: Math.round(macroPer100g.carbs_g * ratio * 10) / 10,
          fat_g: Math.round(macroPer100g.fat_g * ratio * 10) / 10,
        };

        return {
          name: item.name,
          qty: item.qty || 1,
          unit: item.unit || 'serving',
          grams: totalGrams,
          macros: scaledMacros,
          confidence: 0.8,
          originalText: item.originalText || item.name,
          brand: item.brand,
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
 * Generate cache ID for food item
 */
function generateCacheId(foodName: string, brand?: string): string {
  const normalizedName = foodName.toLowerCase().trim().replace(/\s+/g, '_');
  const normalizedBrand = brand ? brand.toLowerCase().trim().replace(/\s+/g, '_') : 'generic';
  return `${normalizedName}:${normalizedBrand}:100g`;
}

/**
 * Check food cache before calling LLM
 */
async function checkFoodCache(
  supabase: any,
  foodName: string,
  brand?: string
): Promise<{ kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null> {
  try {
    const cacheId = generateCacheId(foodName, brand);

    const { data, error } = await supabase
      .from('food_cache')
      .select('macros, access_count')
      .eq('id', cacheId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.warn('[TMWYA Cache] Lookup error:', error);
      return null;
    }

    if (data && data.macros) {
      // Update access count and last_accessed
      await supabase
        .from('food_cache')
        .update({
          access_count: (data.access_count || 0) + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('id', cacheId);

      // Log cache hit analytics
      await supabase.rpc('log_food_cache_event', {
        p_event_type: 'cache_hit',
        p_food_name: foodName,
        p_brand: brand || null,
        p_cache_id: cacheId,
        p_provider: 'cache',
        p_response_time_ms: 10,
        p_estimated_cost_usd: 0.0
      }).catch((err: any) => console.warn('[Analytics] Failed to log cache hit:', err));

      console.log('[TMWYA Cache] HIT:', foodName);
      return {
        kcal: data.macros.kcal,
        protein_g: data.macros.protein_g,
        carbs_g: data.macros.carbs_g,
        fat_g: data.macros.fat_g
      };
    }

    // Log cache miss analytics
    await supabase.rpc('log_food_cache_event', {
      p_event_type: 'cache_miss',
      p_food_name: foodName,
      p_brand: brand || null,
      p_cache_id: null,
      p_provider: null,
      p_response_time_ms: null,
      p_estimated_cost_usd: null
    }).catch((err: any) => console.warn('[Analytics] Failed to log cache miss:', err));

    console.log('[TMWYA Cache] MISS:', foodName);
    return null;
  } catch (error) {
    console.error('[TMWYA Cache] Error:', error);
    return null;
  }
}

/**
 * Save food macros to cache
 */
async function saveFoodCache(
  supabase: any,
  foodName: string,
  macros: { kcal: number; protein_g: number; carbs_g: number; fat_g: number },
  brand?: string,
  source: string = 'llm'
): Promise<void> {
  try {
    const cacheId = generateCacheId(foodName, brand);

    await supabase
      .from('food_cache')
      .upsert({
        id: cacheId,
        name: foodName,
        brand: brand || null,
        serving_size: '100g',
        grams_per_serving: 100,
        macros: macros,
        source_db: source,
        confidence: 0.85,
        access_count: 1,
        last_accessed: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('[TMWYA Cache] SAVED:', foodName);
  } catch (error) {
    console.error('[TMWYA Cache] Save error:', error);
  }
}

/**
 * Call Gemini API for nutrition data
 */
async function callGeminiForMacros(
  supabase: any,
  foodName: string,
  geminiApiKey: string,
  brand?: string
): Promise<{ kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null> {
  const prompt = `Return the nutrition facts per 100g for: ${foodName.trim()} as typically prepared in North America. Respond ONLY with valid JSON using these exact keys: kcal, protein_g, carbs_g, fat_g. Example: {"kcal": 165, "protein_g": 31, "carbs_g": 0, "fat_g": 3.6}`;

  const startTime = Date.now();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 150,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      console.error('[TMWYA Gemini] Error:', await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) return null;

    const macros = JSON.parse(content);

    // Validate non-zero values
    const total = (macros.protein_g || 0) + (macros.carbs_g || 0) + (macros.fat_g || 0);
    if (total === 0 && macros.kcal === 0) {
      console.warn('[TMWYA Gemini] All zeros for:', foodName);
      return null;
    }

    // Log Gemini API call analytics (estimated cost: ~$0.0001)
    await supabase.rpc('log_food_cache_event', {
      p_event_type: 'gemini_call',
      p_food_name: foodName,
      p_brand: brand || null,
      p_cache_id: null,
      p_provider: 'gemini',
      p_response_time_ms: responseTime,
      p_estimated_cost_usd: 0.0001
    }).catch((err: any) => console.warn('[Analytics] Failed to log Gemini call:', err));

    console.log('[TMWYA Gemini] SUCCESS:', foodName);
    return {
      kcal: Number(macros.kcal) || 0,
      protein_g: Number(macros.protein_g) || 0,
      carbs_g: Number(macros.carbs_g) || 0,
      fat_g: Number(macros.fat_g) || 0
    };
  } catch (error) {
    console.error('[TMWYA Gemini] Error:', error);
    return null;
  }
}

/**
 * Resolve food item to macros with cache-first strategy and Gemini fallback
 * Returns macros PER 100G to match the chat query database
 */
async function resolveFoodMacros(
  supabase: any,
  foodName: string,
  openaiApiKey: string,
  geminiApiKey?: string,
  brand?: string
): Promise<{ kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null> {
  // Step 1: Check cache first
  const cachedMacros = await checkFoodCache(supabase, foodName, brand);
  if (cachedMacros) {
    return cachedMacros;
  }

  // Step 2: Try Gemini (cheaper and faster)
  if (geminiApiKey) {
    const geminiMacros = await callGeminiForMacros(supabase, foodName, geminiApiKey, brand);
    if (geminiMacros) {
      // Save to cache for future use
      await saveFoodCache(supabase, foodName, geminiMacros, brand, 'gemini');
      return geminiMacros;
    }
  }

  // Step 3: Fallback to GPT-4o if Gemini fails
  const prompt = `Return the nutrition facts per 100g (calories, protein, carbs, fat) for: ${foodName.trim()} as typically prepared in North America. Respond as JSON with keys: kcal, protein_g, carbs_g, fat_g. If unsure, state your best guess based on recent internet sources. If you cannot provide a reasonable estimate, respond with a JSON object containing a single key 'error' with value 'unconfident'.`;

  const startTime = Date.now();
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      console.error('[TMWYA GPT4o] Fallback error:', await response.text());
      return null;
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    // Try to extract JSON if wrapped in markdown
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '').trim();
    }

    const macros = JSON.parse(jsonContent);

    // Validate that we have actual values (not all zeros)
    const total = (macros.protein_g || 0) + (macros.carbs_g || 0) + (macros.fat_g || 0);
    if (total === 0 && macros.kcal === 0) {
      console.warn('[TMWYA GPT4o] All zeros for:', foodName);
      return null;
    }

    const openaiMacros = {
      kcal: Number(macros.kcal) || 0,
      protein_g: Number(macros.protein_g) || 0,
      carbs_g: Number(macros.carbs_g) || 0,
      fat_g: Number(macros.fat_g) || 0
    };

    // Log GPT-4o API call analytics (estimated cost: ~$0.002)
    await supabase.rpc('log_food_cache_event', {
      p_event_type: 'gpt4o_call',
      p_food_name: foodName,
      p_brand: brand || null,
      p_cache_id: null,
      p_provider: 'gpt4o',
      p_response_time_ms: responseTime,
      p_estimated_cost_usd: 0.002
    }).catch((err: any) => console.warn('[Analytics] Failed to log GPT-4o call:', err));

    // Save GPT-4o result to cache
    await saveFoodCache(supabase, foodName, openaiMacros, brand, 'gpt4o');
    console.log('[TMWYA GPT4o] FALLBACK SUCCESS:', foodName);

    return openaiMacros;
  } catch (error) {
    console.error('[TMWYA] Macro resolution error:', error);
    return null;
  }
}

/**
 * Calculate grams from quantity + unit
 * Enhanced version with better food-specific defaults
 */
function calculateGrams(qty: number, unit: string, foodName?: string): number {
  const unitLower = unit.toLowerCase();
  const foodLower = (foodName || '').toLowerCase();

  const conversions: Record<string, number> = {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'oz': 28.35,
    'ounce': 28.35,
    'ounces': 28.35,
    'lb': 453.59,
    'lbs': 453.59,
    'pound': 453.59,
    'pounds': 453.59,
    'cup': 240,
    'cups': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tablespoons': 15,
    'tsp': 5,
    'teaspoon': 5,
    'teaspoons': 5,
    'ml': 1,
    'l': 1000,
    'liter': 1000,
    // Food-specific defaults
    'egg': 50,
    'eggs': 50,
    'large egg': 50,
    'large eggs': 50,
    'slice': 30,
    'slices': 30,
    'piece': 100,
    'pieces': 100,
    'serving': 100,
    'servings': 100,
    'banana': 120,
    'bananas': 120,
    'apple': 180,
    'apples': 180,
    'steak': 225,  // typical 8oz steak portion
  };

  // Check for food-specific units first
  if (foodLower.includes('egg')) {
    return 50 * qty;  // Large egg = 50g
  }

  // Check if unit mentions a specific weight
  const ozMatch = unitLower.match(/(\d+)\s*oz/);
  if (ozMatch) {
    return parseFloat(ozMatch[1]) * 28.35 * qty;
  }

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
