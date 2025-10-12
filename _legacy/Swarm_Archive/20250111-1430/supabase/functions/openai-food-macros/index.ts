import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

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
  confidence?: number;
  source?: string;
  basis?: string;
}

Deno.serve(async (req: Request) => {
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

    // Call the unified nutrition-resolver edge function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[openai-food-macros] Calling nutrition-resolver for:', foodName);

    const { data: resolverData, error: resolverError } = await supabase.functions.invoke('nutrition-resolver', {
      body: { foodName, useCache: true }
    });

    if (resolverError) {
      console.error('[openai-food-macros] Resolver error:', resolverError);
      return new Response(
        JSON.stringify({ error: resolverError.message || 'Failed to resolve nutrition data' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!resolverData) {
      return new Response(
        JSON.stringify({ error: 'No data returned from nutrition resolver' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate macro data structure
    const macro = resolverData as MacroResponse;
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

    console.log('[openai-food-macros] Resolved macros:', {
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
    console.error('[openai-food-macros] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});