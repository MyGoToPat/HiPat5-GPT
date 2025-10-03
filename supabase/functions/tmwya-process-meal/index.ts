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
    needsClarification?: boolean;
    suggestions?: string[];
  }>;
  meal_slot?: string;
  error?: string;
  step?: string;
  needsClarification?: boolean;
  clarificationPrompt?: string;
}

/**
 * TMWYA Edge Function v2.1 - Cache-First with Semantic Resolution
 */

Deno.serve(async (req: Request) => {
  console.log('[TMWYA v2.1] Cache-first + semantic version starting...');

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[TMWYA] Processing:', { userId, source });

    const parseResult = await parseMealInput(userMessage, openaiApiKey);

    if (!parseResult.ok || !parseResult.items || parseResult.items.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No food items detected', step: 'parsing' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[TMWYA] Parsed items:', parseResult.items.length);

    const resolvedItems = await Promise.all(
      parseResult.items.map(async (item) => {
        const resolution = await resolveFoodName(supabase, item.name, userId);
        const needsClarification = resolution.confidence < 0.8 && resolution.suggestions;
        const macroPer100g = await resolveFoodMacros(supabase, resolution.resolvedName, openaiApiKey, geminiApiKey, item.brand);

        if (!macroPer100g) {
          return {
            name: resolution.resolvedName,
            qty: item.qty || 1,
            unit: item.unit || 'serving',
            grams: calculateGrams(item.qty || 1, item.unit || 'serving'),
            macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
            confidence: 0.3,
            originalText: item.originalText || item.name,
            brand: item.brand,
            needsClarification,
            suggestions: resolution.suggestions,
          };
        }

        const totalGrams = calculateGrams(item.qty || 1, item.unit || 'serving', resolution.resolvedName);
        const ratio = totalGrams / 100;
        const scaledMacros = {
          kcal: Math.round(macroPer100g.kcal * ratio * 10) / 10,
          protein_g: Math.round(macroPer100g.protein_g * ratio * 10) / 10,
          carbs_g: Math.round(macroPer100g.carbs_g * ratio * 10) / 10,
          fat_g: Math.round(macroPer100g.fat_g * ratio * 10) / 10,
        };

        return {
          name: resolution.resolvedName,
          qty: item.qty || 1,
          unit: item.unit || 'serving',
          grams: totalGrams,
          macros: scaledMacros,
          confidence: resolution.confidence,
          originalText: item.originalText || item.name,
          brand: item.brand,
          needsClarification,
          suggestions: resolution.suggestions,
        };
      })
    );

    const itemsNeedingClarification = resolvedItems.filter(item => item.needsClarification);
    const needsClarification = itemsNeedingClarification.length > 0;

    let clarificationPrompt = '';
    if (needsClarification) {
      const itemPrompts = itemsNeedingClarification.map(item => {
        if (item.suggestions && item.suggestions.length > 1) {
          return `Did you mean **${item.suggestions[0]}** or **${item.suggestions[1]}** when you said "${item.originalText}"?`;
        }
        return `I'm not 100% sure about "${item.originalText}". Did you mean **${item.name}**?`;
      });
      clarificationPrompt = itemPrompts.join(' ');
    }

    const response: TMWYAResponse = {
      ok: true,
      items: resolvedItems,
      meal_slot: parseResult.meal_slot || determineMealSlot(),
      step: needsClarification ? 'needs_clarification' : 'verification_ready',
      needsClarification,
      clarificationPrompt
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[TMWYA] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Internal server error', step: 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function parseMealInput(message: string, apiKey: string): Promise<any> {
  const systemPrompt = `You are a semantic food NLU parser. Parse food items with awareness of regional terminology and meat cuts.\n\nEXTRACT:\n- name: Food item (use SPECIFIC terms - see SEMANTIC RULES)\n- qty: Numeric quantity\n- unit: Unit (g, oz, cup, piece, serving)\n- brand: Brand name\n- prep_method: Cooking method\n- originalText: Exact user text\n\nSEMANTIC RULES for meat cuts:\n- "new york steak", "ny strip", "strip steak" → "striploin"\n- "ribeye" or "rib eye" → "ribeye"\n- "filet mignon" → "tenderloin"\n\nFor ambiguous terms:\n- "chicken" without cut → "chicken" (clarify later)\n- "yogurt" → "yogurt" (clarify greek vs regular)\n- "steak" without cut → "steak" (clarify cut)\n\nRULES:\n- Split compound items\n- Default qty to 1\n- Default unit to "serving"\n- Preserve originalText\n\nOUTPUT JSON:\n{"items": [{"name": "string", "qty": 1, "unit": "serving", "originalText": "string"}], "meal_slot": "breakfast|lunch|dinner|snack"}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) return { ok: false, error: 'Parse failed' };
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: 'No response' };
    return { ok: true, ...JSON.parse(content) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function generateCacheId(foodName: string, brand?: string): string {
  const normalizedName = foodName.toLowerCase().trim().replace(/\s+/g, '_');
  const normalizedBrand = brand ? brand.toLowerCase().trim().replace(/\s+/g, '_') : 'generic';
  return `${normalizedName}:${normalizedBrand}:100g`;
}

async function resolveFoodName(supabase: any, foodName: string, userId: string): Promise<any> {
  const lowerName = foodName.toLowerCase().trim();

  const { data: userPref } = await supabase.from('user_food_preferences').select('resolved_to, use_count').eq('user_id', userId).eq('term_used', lowerName).maybeSingle();
  if (userPref) {
    await supabase.from('user_food_preferences').update({ use_count: (userPref.use_count || 0) + 1, last_used: new Date().toISOString() }).eq('user_id', userId).eq('term_used', lowerName);
    console.log('[Resolution] User pref HIT:', lowerName, '→', userPref.resolved_to);
    return { resolvedName: userPref.resolved_to, confidence: 1.0 };
  }

  const { data: aliases } = await supabase.from('food_aliases').select('canonical_name, confidence').eq('alias_name', lowerName);
  if (aliases && aliases.length > 0) {
    if (aliases.length > 1) {
      return { resolvedName: aliases[0].canonical_name, confidence: 0.5, suggestions: aliases.map((a: any) => a.canonical_name) };
    }
    const alias = aliases[0];
    if (alias.confidence >= 0.8) {
      console.log('[Resolution] Alias HIT:', lowerName, '→', alias.canonical_name);
      return { resolvedName: alias.canonical_name, confidence: alias.confidence };
    }
    return { resolvedName: alias.canonical_name, confidence: alias.confidence, suggestions: [alias.canonical_name, lowerName] };
  }

  return { resolvedName: lowerName, confidence: 1.0 };
}

async function checkFoodCache(supabase: any, foodName: string, brand?: string): Promise<any> {
  try {
    const cacheId = generateCacheId(foodName, brand);
    const { data, error } = await supabase.from('food_cache').select('macros, access_count').eq('id', cacheId).gt('expires_at', new Date().toISOString()).maybeSingle();

    if (error || !data || !data.macros) {
      console.log('[Cache] MISS:', foodName);
      return null;
    }

    await supabase.from('food_cache').update({ access_count: (data.access_count || 0) + 1, last_accessed: new Date().toISOString() }).eq('id', cacheId);
    console.log('[Cache] HIT:', foodName);
    return { kcal: data.macros.kcal, protein_g: data.macros.protein_g, carbs_g: data.macros.carbs_g, fat_g: data.macros.fat_g };
  } catch (error) {
    console.error('[Cache] Error:', error);
    return null;
  }
}

async function saveFoodCache(supabase: any, foodName: string, macros: any, brand?: string, source = 'llm'): Promise<void> {
  try {
    const cacheId = generateCacheId(foodName, brand);
    await supabase.from('food_cache').upsert({
      id: cacheId,
      name: foodName,
      brand: brand || null,
      serving_size: '100g',
      grams_per_serving: 100,
      macros,
      source_db: source,
      confidence: 0.85,
      access_count: 1,
      last_accessed: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    console.log('[Cache] SAVED:', foodName);
  } catch (error) {
    console.error('[Cache] Save error:', error);
  }
}

async function callGeminiForMacros(supabase: any, foodName: string, geminiApiKey: string, brand?: string): Promise<any> {
  const prompt = `Return nutrition facts per 100g for: ${foodName.trim()}. JSON only with keys: kcal, protein_g, carbs_g, fat_g.`;
  const startTime = Date.now();
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 150, responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return null;

    const macros = JSON.parse(content);
    const total = (macros.protein_g || 0) + (macros.carbs_g || 0) + (macros.fat_g || 0);
    if (total === 0 && macros.kcal === 0) return null;

    console.log('[Gemini] SUCCESS:', foodName, '(', Date.now() - startTime, 'ms)');
    return { kcal: Number(macros.kcal) || 0, protein_g: Number(macros.protein_g) || 0, carbs_g: Number(macros.carbs_g) || 0, fat_g: Number(macros.fat_g) || 0 };
  } catch (error) {
    console.error('[Gemini] Error:', error);
    return null;
  }
}

async function resolveFoodMacros(supabase: any, foodName: string, openaiApiKey: string, geminiApiKey?: string, brand?: string): Promise<any> {
  const cachedMacros = await checkFoodCache(supabase, foodName, brand);
  if (cachedMacros) return cachedMacros;

  if (geminiApiKey) {
    const geminiMacros = await callGeminiForMacros(supabase, foodName, geminiApiKey, brand);
    if (geminiMacros) {
      await saveFoodCache(supabase, foodName, geminiMacros, brand, 'gemini');
      return geminiMacros;
    }
  }

  const prompt = `Return nutrition per 100g for: ${foodName.trim()}. JSON with keys: kcal, protein_g, carbs_g, fat_g.`;
  const startTime = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: 'Nutrition expert. JSON only.' }, { role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    content = content.trim().replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const macros = JSON.parse(content);
    const total = (macros.protein_g || 0) + (macros.carbs_g || 0) + (macros.fat_g || 0);
    if (total === 0 && macros.kcal === 0) return null;

    const openaiMacros = { kcal: Number(macros.kcal) || 0, protein_g: Number(macros.protein_g) || 0, carbs_g: Number(macros.carbs_g) || 0, fat_g: Number(macros.fat_g) || 0 };
    await saveFoodCache(supabase, foodName, openaiMacros, brand, 'gpt4o');
    console.log('[GPT4o] SUCCESS:', foodName, '(', Date.now() - startTime, 'ms)');
    return openaiMacros;
  } catch (error) {
    console.error('[GPT4o] Error:', error);
    return null;
  }
}

function calculateGrams(qty: number, unit: string, foodName?: string): number {
  const unitLower = unit.toLowerCase();
  const conversions: Record<string, number> = {
    'g': 1, 'gram': 1, 'grams': 1, 'oz': 28.35, 'lb': 453.59, 'cup': 240, 'tbsp': 15, 'tsp': 5,
    'egg': 50, 'eggs': 50, 'slice': 30, 'piece': 100, 'serving': 100, 'steak': 225
  };
  return (conversions[unitLower] || 100) * qty;
}

function determineMealSlot(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}
