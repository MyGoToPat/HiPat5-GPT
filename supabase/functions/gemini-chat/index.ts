/**
 * Gemini Chat Edge Function
 * Native Gemini chat handler matching openai-chat request/response contract
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma, expires, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { loadSwarmFromDB, buildSwarmPrompt } from '../openai-chat/swarm-loader.ts';
import { executePostAgents } from '../openai-chat/post-executor.ts';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
  userId?: string;
  temperature?: number;
  model?: string;
  provider?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

// Emergency fallback if swarm load fails
const EMERGENCY_FALLBACK = 'You are Pat. Speak clearly and concisely.';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Health check endpoint
  if (req.url.includes('?health=1')) {
    return new Response(JSON.stringify({ status: 'ok', service: 'gemini-chat' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { messages, stream = false, userId, temperature = 0.55, model, provider }: ChatRequest = await req.json();

    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await supabase.auth.getUser();
        effectiveUserId = user?.id;
      }
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
    if (!geminiApiKey) {
      console.error('[gemini-chat] Missing GEMINI_API_KEY secret');
      return new Response(
        JSON.stringify({ error: 'Missing Gemini API key' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Load personality swarm from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[gemini-chat] Missing Supabase service configuration', {
        hasUrl: Boolean(supabaseUrl),
        hasServiceKey: Boolean(supabaseServiceKey)
      });
      return new Response(
        JSON.stringify({ error: 'Missing Supabase service configuration' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Resolve model: use request model, else env var, else default
    const modelToUse = model || Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash';
    console.info('[gemini-chat] model', modelToUse);

    let systemPrompt: string;
    const hasSystemPrompt = messages.length > 0 && messages[0].role === 'system';

    if (hasSystemPrompt) {
      // Client provided system prompt (passthrough mode)
      systemPrompt = messages[0].content;
      console.log('[gemini-chat] systemPrompt: source=client');
    } else {
      // Load personality swarm from database
      const swarm = await loadSwarmFromDB('personality', supabaseUrl, supabaseServiceKey);

      if (!swarm) {
        console.error('[gemini-chat] ✗ CRITICAL: Personality swarm not found in database!');
        console.error('[gemini-chat] → Using emergency fallback prompt');
        systemPrompt = EMERGENCY_FALLBACK;
      } else {
        console.log(`[gemini-chat] ✓ Loaded swarm: personality (${swarm.agents.length} agents)`);
        systemPrompt = await buildSwarmPrompt(swarm, supabaseUrl, supabaseServiceKey);
      }
    }

    // Gemini doesn't support 'system' role, so prepend system prompt to first user message
    const messagesWithSystem: ChatMessage[] = hasSystemPrompt
      ? messages
      : [{ role: 'system', content: systemPrompt }, ...messages];

    console.log('[gemini-chat] Total messages:', messagesWithSystem.length);
    console.log('[gemini-chat] System prompt length:', systemPrompt.length);
    console.log('[gemini-chat] Temperature:', temperature);

    // Convert OpenAI format to Gemini format
    // Gemini roles: 'user' (for both system and user) and 'model' (for assistant)
    // Extract system messages and prepend as single 'SYSTEM: ...' user message
    const sysMessages = messagesWithSystem.filter(m => m.role === 'system');
    const sys = sysMessages.map(m => `SYSTEM: ${m.content}`).join('\n');
    const chatMessages = messagesWithSystem.filter(m => m.role !== 'system');

    const geminiContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    
    // Prepend system prompt as a single user message
    if (sys) {
      geminiContents.push({
        role: 'user',
        parts: [{ text: sys }]
      });
    }

    // Map remaining messages: user -> user, assistant -> model
    for (const msg of chatMessages) {
      geminiContents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(msg.content ?? '') }]
      });
    }

    if (stream) {
      console.log('[gemini-chat] Streaming mode - not yet implemented, falling back to non-streaming');
      // TODO: Implement streaming if needed
    }

    // Call Gemini API (using v1 endpoint)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelToUse}:generateContent?key=${geminiApiKey}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: 700,
          topP: 0.95,
        },
      }),
    });

    // ✅ Bubble up Google's exact error text
    const txt = await geminiResponse.text();
    
    if (!geminiResponse.ok) {
      console.error('[gemini-chat] API error', geminiResponse.status, txt);
      return new Response(
        JSON.stringify({ error: 'gemini_api_error', details: txt }),
        {
          status: geminiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const geminiData: GeminiResponse = JSON.parse(txt);
    const candidate = geminiData?.candidates?.[0];

    if (!candidate?.content?.parts || candidate.content.parts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No response from Gemini' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Extract text from all parts
    const messageText = candidate.content.parts
      .map(part => part.text || '')
      .join('')
      .trim();

    if (!messageText) {
      return new Response(
        JSON.stringify({ error: 'Empty response from Gemini' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Execute post-agents for personality polish (same as openai-chat)
    let finalMessage = messageText;
    try {
      // Load swarm for post-execution if available
      const swarm = await loadSwarmFromDB('personality', supabaseUrl, supabaseServiceKey);
      if (swarm?.agents?.some((a: any) => a.phase === 'post' && a.enabled)) {
        const refined = await executePostAgents(finalMessage, swarm, null, 'combined');
        console.log(`[gemini-chat] Post-agent refined: ${finalMessage.length} → ${refined.length}`);
        finalMessage = refined;
      }
    } catch (postErr) {
      console.warn('[gemini-chat] Post-agent execution failed, using original response:', postErr);
    }

    // Return same format as openai-chat
    // Note: Gemini doesn't support tool calling, so tool_calls is always empty/null
    return new Response(
      JSON.stringify({
        message: finalMessage,
        tool_calls: null, // Gemini doesn't support tool calling
        finish_reason: candidate.finishReason || 'stop'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[gemini-chat] EXCEPTION', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

