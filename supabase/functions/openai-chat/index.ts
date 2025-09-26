import { corsHeaders } from '../_shared/cors.ts';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

interface OpenAICallBody {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  max_tokens: number;
}

const PAT_SYSTEM_PROMPT = `You are Pat, Hyper Intelligent Personal Assistant Team. Always speak in first person, mentor tone, health/fitness context. Avoid medical diagnoses. Adhere to user settings.

Key personality traits:
- Speak as "I" not "we" 
- Be encouraging and supportive
- Focus on health, fitness, nutrition, and wellness
- Provide practical, actionable advice
- Never give medical diagnoses or replace professional medical advice
- Be concise but helpful
- Show enthusiasm for user progress and goals`;

// Configuration with environment variable fallbacks
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const DEFAULT_MODEL = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = Number(Deno.env.get('OPENAI_TEMPERATURE') ?? 0.2);
const DEFAULT_MAX_TOKENS = Number(Deno.env.get('OPENAI_MAX_TOKENS') ?? 600);

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOpenAI(body: OpenAICallBody): Promise<{ status: number; json: any; text: string }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
    }),
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Keep json as null if parsing fails
  }

  return {
    status: response.status,
    json,
    text
  };
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
    // Validate OpenAI API key
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse and validate request
    const { messages, model, temperature, max_tokens }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract parameters with fallback chain: request → env → defaults
    const requestModel = (model || DEFAULT_MODEL).trim();
    const requestTemperature = typeof temperature === 'number' ? temperature : DEFAULT_TEMPERATURE;
    const requestMaxTokens = typeof max_tokens === 'number' ? max_tokens : DEFAULT_MAX_TOKENS;

    // Validate parameter ranges for safety
    const safeTemperature = Math.max(0, Math.min(2, requestTemperature));
    const safeMaxTokens = Math.max(1, Math.min(4000, requestMaxTokens));

    // Prepare messages with system prompt (preserve existing behavior)
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: PAT_SYSTEM_PROMPT },
      ...messages
    ];

    // Retry loop for 429 rate limit resilience
    let lastResponse: { status: number; json: any; text: string } | null = null;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await callOpenAI({
          model: requestModel,
          messages: messagesWithSystem,
          temperature: safeTemperature,
          max_tokens: safeMaxTokens,
        });

        lastResponse = result;

        // Success case
        if (result.status === 200) {
          const assistantMessage = result.json?.choices?.[0]?.message?.content;

          if (!assistantMessage) {
            return new Response(
              JSON.stringify({ error: 'No response from AI' }),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }

          // Log usage for monitoring (preserve existing behavior)
          console.log('OpenAI Chat - Usage:', {
            input_tokens: result.json?.usage?.prompt_tokens,
            output_tokens: result.json?.usage?.completion_tokens,
            total_tokens: result.json?.usage?.total_tokens,
            model: requestModel,
            timestamp: new Date().toISOString()
          });

          return new Response(
            JSON.stringify({ 
              message: assistantMessage,
              usage: result.json?.usage 
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // Non-429 error - return immediately (don't retry)
        if (result.status !== 429) {
          console.error('OpenAI API error (non-429):', result.text);
          
          if (result.status === 401) {
            return new Response(
              JSON.stringify({ error: 'OpenAI API authentication failed' }),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          
          return new Response(
            JSON.stringify({ error: 'I\'m having trouble connecting right now. Please try again later.' }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // 429 rate limit - log and retry
        console.log(`OpenAI rate limit hit - attempt ${attempt + 1}/${MAX_RETRIES}`);
        
        // Don't sleep on the last attempt since we'll return fallback
        if (attempt < MAX_RETRIES - 1) {
          const jitter = Math.floor(Math.random() * 250);
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
          console.log(`Retrying in ${delay}ms...`);
          await sleep(delay);
        }

      } catch (fetchError) {
        console.error(`OpenAI API call failed on attempt ${attempt + 1}:`, fetchError);
        
        // On network/fetch errors, don't retry - return error immediately
        return new Response(
          JSON.stringify({ error: 'Network error connecting to AI service' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Still rate-limited after all retries - return graceful 200 fallback
    console.log('OpenAI rate limit persists after all retries - returning graceful fallback');
    
    const fallbackMessage = "I'm experiencing high demand right now. Please try your question again in a moment, and I'll provide a complete response.";
    
    return new Response(
      JSON.stringify({ message: fallbackMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in openai-chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});