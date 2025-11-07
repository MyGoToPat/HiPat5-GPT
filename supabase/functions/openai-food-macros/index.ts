import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, expires, accept',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface FoodMacroRequest {
  foodName: string;
}

interface MacroResponse {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence?: number;
  source?: string;
  basis?: string;
}

Deno.serve(async (req: Request) => {
  console.log('[openai-food-macros] START', { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    let body: FoodMacroRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { foodName } = body;
    if (!foodName || typeof foodName !== 'string') {
      return new Response(JSON.stringify({ error: 'foodName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[openai-food-macros] Processing:', foodName);

    // Call OpenAI for macro estimation
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const prompt = `You are a nutrition expert. For the food "${foodName}", provide nutritional estimates per 100g in this exact JSON format only:

{"kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number, "confidence": 0.0-1.0, "source": "estimated", "basis": "USDA average"}

Return only the JSON object, no other text. Use realistic values based on standard nutritional data.`;

    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        model: 'gpt-4o-mini',
        provider: 'openai',
        response_format: { type: 'json_object' }
      }
    });

    if (error || !data?.message) {
      console.error('[openai-food-macros] OpenAI error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to get macro data',
        details: error?.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse the response
    let response: MacroResponse;
    try {
      const rawText = data.message;
      response = JSON.parse(rawText);
    } catch (parseError) {
      console.error('[openai-food-macros] Parse error:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid response format',
        raw: data.message?.substring(0, 200)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[openai-food-macros] SUCCESS:', { foodName, kcal: response.kcal });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[openai-food-macros] UNEXPECTED ERROR:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: err instanceof Error ? err.message : String(err)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
