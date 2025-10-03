const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
}

interface ErrorResponse {
  error: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { foodName }: FoodMacroRequest = await req.json();

    if (!foodName || typeof foodName !== 'string' || foodName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid food name provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Construct the nutrition lookup prompt - CRITICAL: Request RAW values
    const prompt = `Return the nutrition facts per 100g for RAW, UNCOOKED ${foodName.trim()}. CRITICAL: Use RAW ingredient values, NOT cooked or prepared. For example, raw chicken breast is ~165kcal/100g, raw egg is ~143kcal/100g. Respond as JSON with keys: kcal, protein_g, carbs_g, fat_g. If unsure, state your best guess based on USDA database values for RAW ingredients. If you cannot provide a reasonable estimate, respond with a JSON object containing a single key 'error' with value 'unconfident'.`;

    // Call OpenAI API
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
      console.error('OpenAI API error:', errorData);
      
      return new Response(
        JSON.stringify({ error: 'Unable to fetch nutrition data right now' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: 'No response from nutrition service' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse the JSON response
    let macroData: MacroResponse | ErrorResponse;
    try {
      macroData = JSON.parse(assistantMessage.trim());
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', assistantMessage);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from nutrition service' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if OpenAI indicated uncertainty
    if ('error' in macroData && macroData.error === 'unconfident') {
      return new Response(
        JSON.stringify({ error: 'unconfident', message: 'Could not find reliable nutrition data for this food' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate macro data structure
    const macro = macroData as MacroResponse;
    if (typeof macro.kcal !== 'number' || 
        typeof macro.protein_g !== 'number' || 
        typeof macro.carbs_g !== 'number' || 
        typeof macro.fat_g !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid nutrition data format received' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log the query for analytics
    console.log('Food Macro Lookup:', {
      foodName: foodName.trim(),
      result: macro,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify(macro),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in openai-food-macros function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});