import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma, expires, accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
  safetyRatings?: any[];
};

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

interface GeminiPayload {
  name: string;
  brand?: string | null;
  serving_label?: string | null;
  grams_per_serving?: number | null;
  macros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number | null;
  };
  confidence?: number | null;
  source?: string | null;
}

function safeTruncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

function extractJSONFromText(text: string): string | null {
  // First, try to extract from fenced code blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1];
  }

  // Find the first complete JSON object by counting braces
  let braceCount = 0;
  let startIdx = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (startIdx === -1) startIdx = i;
      braceCount++;
    } else if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0 && startIdx !== -1) {
        return text.substring(startIdx, i + 1);
      }
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  console.log('[nutrition-gemini] START', { method: req.method });
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  // Health check endpoint
  if (req.url.includes('?health=1')) {
    return new Response(JSON.stringify({ status: 'ok', service: 'nutrition-gemini' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'JSON body required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const foodName: string = body?.foodName;
    const canonicalName: string | undefined = body?.canonicalName;
    console.log('[nutrition-gemini] BODY', { foodName, canonicalName });

    if (!foodName || typeof foodName !== 'string') {
      return new Response(JSON.stringify({ error: 'foodName is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const geminiApiKey = (Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_GENAI_API_KEY'))?.trim();
    if (!geminiApiKey) {
      console.error('[nutrition-gemini] NO_API_KEY');
      return new Response(JSON.stringify({ error: 'Missing Gemini API key' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log('[nutrition-gemini] CALL_GEMINI', { foodName });

    const prompt = `You are a nutrition database. Respond ONLY with valid JSON. No commentary.

If the food is a branded or restaurant item (e.g., McDonald's, Starbucks, Chick-fil-A, etc.), return the nutrition facts **per serving as sold**. Include the real serving weight in grams.

If the food is a generic ingredient, return cooked values per 100 g.

JSON keys: {
  "name": string,
  "brand": string | null,
  "serving_label": string,
  "grams_per_serving": number,
  "macros": {
    "kcal": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number
  },
  "confidence": number (0-1),
  "source": string (data source used)
}

If you cannot find reliable data, return {"error":"unconfident"}.

Food: ${foodName}`;

    const modelId = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    console.info('[nutrition-gemini] model', modelId);
    
    // Wrap Gemini call in try/catch for upstream errors with fallback retry
    let response: Response;
    let responseBody: string;
    let modelToUse = modelId;
    
    const makeGeminiRequest = async (model: string): Promise<Response> => {
      return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topP: 0.8,
            maxOutputTokens: 800,
            responseMimeType: 'application/json',
          },
        }),
      });
    };
    
    try {
      response = await makeGeminiRequest(modelToUse);
      responseBody = await response.text();
      console.log('[nutrition-gemini] provider body:', safeTruncate(responseBody, 1200));

      // ✅ Check for model not found errors and retry with fallback
      if (!response.ok && (response.status === 404 || responseBody.includes('NOT_FOUND') || responseBody.includes('MODEL_NOT_FOUND'))) {
        if (modelToUse !== 'gemini-2.5-flash') {
          console.warn('[nutrition-gemini] fallback to gemini-2.5-flash');
          modelToUse = 'gemini-2.5-flash';
          response = await makeGeminiRequest(modelToUse);
          responseBody = await response.text();
          console.log('[nutrition-gemini] fallback response body:', safeTruncate(responseBody, 1200));
        }
      }

      if (!response.ok) {
        console.error('[nutrition-gemini] GEMINI_ERROR_TEXT', safeTruncate(responseBody, 500));
        return new Response(
          JSON.stringify({
            error: 'Upstream error',
            providerStatus: response.status,
            providerBody: safeTruncate(responseBody, 500)
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (err) {
      console.error('[nutrition-gemini] FETCH_EXCEPTION', err);
      return new Response(
        JSON.stringify({
          error: 'Network error',
          details: err instanceof Error ? err.message : String(err)
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse Gemini response
    let geminiData: GeminiResponse;
    try {
      geminiData = JSON.parse(responseBody) as GeminiResponse;
    } catch (err) {
      console.error('[nutrition-gemini] RESPONSE_PARSE_ERROR', err);
      return new Response(
        JSON.stringify({
          error: 'Invalid response format from Gemini',
          raw: safeTruncate(responseBody, 400)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract text from all parts (Gemini 2.x may have multiple parts)
    const candidate = geminiData?.candidates?.[0];
    if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
      console.error('[nutrition-gemini] NO_CANDIDATES');
      return new Response(
        JSON.stringify({ error: 'Empty response from Gemini' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullText = candidate.content.parts
      .map(part => part.text || '')
      .join('')
      .trim();

    console.log('[nutrition-gemini] parsed text:', safeTruncate(fullText, 600));

    if (!fullText) {
      console.error('[nutrition-gemini] EMPTY_TEXT');
      return new Response(
        JSON.stringify({ error: 'Empty response from Gemini' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JSON robustly
    let jsonText = fullText;
    const extracted = extractJSONFromText(fullText);
    if (extracted) {
      jsonText = extracted;
    }

    console.log('[nutrition-gemini] CLEANED_TEXT', safeTruncate(jsonText, 200));

    // Parse JSON payload
    let payload: GeminiPayload | { error: string };
    try {
      payload = JSON.parse(jsonText);
    } catch (err) {
      console.error('[nutrition-gemini] JSON_PARSE_ERROR', err, 'text:', safeTruncate(jsonText, 800));
      return new Response(
        JSON.stringify({
          error: 'Invalid response format from Gemini',
          raw: safeTruncate(jsonText, 800),
          parseError: err instanceof Error ? err.message : String(err)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle unconfident response
    if ('error' in payload && payload.error === 'unconfident') {
      return new Response(
        JSON.stringify({ error: 'unconfident' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payload shape
    if (!payload.name || !payload.macros) {
      console.error('[nutrition-gemini] INVALID_SHAPE', payload);
      return new Response(
        JSON.stringify({
          error: 'Invalid response format from Gemini',
          raw: safeTruncate(JSON.stringify(payload), 400)
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Coerce and validate macros (numbers only)
    const macros = {
      kcal: Number(payload.macros.kcal) || 0,
      protein_g: Number(payload.macros.protein_g) || 0,
      carbs_g: Number(payload.macros.carbs_g) || 0,
      fat_g: Number(payload.macros.fat_g) || 0,
      fiber_g: Number(payload.macros.fiber_g) || 0,
    };

    const cleaned: GeminiPayload = {
      name: payload.name ?? (canonicalName || foodName),
      brand: payload.brand ?? null,
      serving_label: payload.serving_label ?? 'serving',
      grams_per_serving: typeof payload.grams_per_serving === 'number' ? payload.grams_per_serving : 100,
      macros,
      confidence: typeof payload.confidence === 'number' ? payload.confidence : 0.85,
      source: payload.source ?? 'gemini'
    };

    console.log('[nutrition-gemini] FINAL_RESULT', { name: cleaned.name, kcal: cleaned.macros.kcal });
    return new Response(JSON.stringify(cleaned), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[nutrition-gemini] EXCEPTION', err);
    const errorDetails = err instanceof Error ? {
      message: err.message,
      stack: err.stack,
      name: err.name
    } : String(err);
    console.error('[nutrition-gemini] EXCEPTION_DETAILS', JSON.stringify(errorDetails));
    return new Response(JSON.stringify({ 
      error: 'Unexpected error',
      details: err instanceof Error ? err.message : String(err)
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
