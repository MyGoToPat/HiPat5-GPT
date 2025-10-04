import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

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

Deno.serve(async (req: Request) => {
  console.log('[TMWYA] GPT-4o ONLY - No Gemini, No Cache');

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
    console.log('[TMWYA] API Key check:', openaiApiKey ? 'Found' : 'NOT FOUND');

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
        const macroPer100g = await getFoodMacros(item.name, openaiApiKey, item.brand);

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

        const totalGrams = calculateGrams(item.qty || 1, item.unit || 'serving', item.name);
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
          confidence: 0.9,
          originalText: item.originalText || item.name,
          brand: item.brand,
        };
      })
    );

    const response: TMWYAResponse = {
      ok: true,
      items: resolvedItems,
      meal_slot: parseResult.meal_slot || determineMealSlot(),
      step: 'verification_ready',
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

async function getFoodMacros(foodName: string, apiKey: string, brand?: string): Promise<any> {
  const prompt = `Return nutrition per 100g for RAW, UNCOOKED ${foodName.trim()}. CRITICAL: Use RAW ingredient values, NOT cooked or prepared. For example, raw egg is 143kcal per 100g, raw chicken breast is ~165kcal/100g. JSON with keys: kcal, protein_g, carbs_g, fat_g.`;
  const startTime = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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

    const result = { kcal: Number(macros.kcal) || 0, protein_g: Number(macros.protein_g) || 0, carbs_g: Number(macros.carbs_g) || 0, fat_g: Number(macros.fat_g) || 0 };

    console.log('[GPT4o] SUCCESS:', foodName, '(', Date.now() - startTime, 'ms)');
    return result;
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