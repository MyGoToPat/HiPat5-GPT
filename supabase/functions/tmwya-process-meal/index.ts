/**
 * TMWYA Process Meal - Stub/Redirect Handler
 * 
 * This edge function is deprecated. Food logging now routes through
 * the unified OpenAI chat handler with function calling.
 * 
 * This stub exists for backwards compatibility and redirects clients
 * to use the chat interface.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log('[tmwya-process-meal] DEPRECATED - received request:', body);

    // Return error directing to use chat interface
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'This endpoint is deprecated. Please use the chat interface for food logging.',
        step: 'deprecated',
        deprecated: true,
        migration_note: 'Food logging now uses OpenAI function calling through the unified chat handler.'
      }),
      {
        status: 410, // Gone
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[tmwya-process-meal] Error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: 'Endpoint is deprecated',
        deprecated: true
      }),
      {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});