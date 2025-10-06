import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface NutritionRequest {
  foodName: string;
  useCache?: boolean;
}

interface MacroResponse {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  source: string;
  basis: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS" || req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { foodName, useCache = true }: NutritionRequest = await req.json();

    if (!foodName || typeof foodName !== 'string' || foodName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid food name provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalizedFood = foodName.trim().toLowerCase();

    // Step 1: Check portion_defaults cache
    if (useCache) {
      const { data: cached, error: cacheError } = await supabase
        .from('portion_defaults')
        .select('*')
        .eq('food_name', normalizedFood)
        .maybeSingle();

      if (cached && !cacheError) {
        console.log('[Nutrition Resolver] Cache HIT:', normalizedFood);
        return new Response(
          JSON.stringify({
            kcal: Number(cached.kcal),
            protein_g: Number(cached.protein_g),
            carbs_g: Number(cached.carbs_g),
            fat_g: Number(cached.fat_g),
            confidence: Number(cached.confidence),
            source: cached.source,
            basis: cached.basis
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[Nutrition Resolver] Cache MISS:', normalizedFood);

    // Step 2: Call OpenAI GPT-4o with strict RAW per 100g prompt
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isBrandedFood = /big mac|whopper|quarter pounder|mcdonalds|burger king|wendys|subway|chipotle|starbucks/i.test(normalizedFood);

    const prompt = isBrandedFood
      ? `Return the actual nutrition facts for ${foodName.trim()} as served by the restaurant. Use real menu data. For example, a Big Mac is ~550kcal total, not per 100g. Respond as JSON with keys: kcal, protein_g, carbs_g, fat_g for the ENTIRE item as served.`
      : `Return the nutrition facts per 100g for RAW, UNCOOKED ${foodName.trim()}. CRITICAL: Use RAW ingredient values, NOT cooked or prepared. For example, raw chicken breast is ~107kcal/100g, raw egg is ~143kcal/100g. Respond as JSON with keys: kcal, protein_g, carbs_g, fat_g. Use USDA database values for RAW ingredients. If unsure, state your best guess based on USDA RAW values. If you cannot provide a reasonable estimate, respond with a JSON object containing a single key 'error' with value 'unconfident'.`;

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
      return new Response(
        JSON.stringify({ error: 'Unable to fetch nutrition data right now' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: 'No response from nutrition service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let macroData: MacroResponse | { error: string };
    try {
      macroData = JSON.parse(assistantMessage.trim());
    } catch (parseError) {
      console.error('[Nutrition Resolver] Failed to parse OpenAI response:', assistantMessage);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from nutrition service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ('error' in macroData && macroData.error === 'unconfident') {
      return new Response(
        JSON.stringify({ error: 'unconfident', message: 'Could not find reliable nutrition data for this food' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const macro = macroData as MacroResponse;
    if (typeof macro.kcal !== 'number' || typeof macro.protein_g !== 'number' || typeof macro.carbs_g !== 'number' || typeof macro.fat_g !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid nutrition data format received' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Cache the result in portion_defaults
    const { error: insertError } = await supabase
      .from('portion_defaults')
      .insert({
        food_name: normalizedFood,
        basis: isBrandedFood ? 'branded_item' : 'raw_per_100g',
        kcal: macro.kcal,
        protein_g: macro.protein_g,
        carbs_g: macro.carbs_g,
        fat_g: macro.fat_g,
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

    return new Response(
      JSON.stringify({
        kcal: macro.kcal,
        protein_g: macro.protein_g,
        carbs_g: macro.carbs_g,
        fat_g: macro.fat_g,
        confidence: 0.85,
        source: 'gpt-4o',
        basis: isBrandedFood ? 'branded_item' : 'raw_per_100g'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Nutrition Resolver] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});