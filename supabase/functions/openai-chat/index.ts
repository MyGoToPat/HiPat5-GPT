const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma, expires, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};
import { PAT_TOOLS, executeTool } from './tools.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.53.0';
import { loadPersonality } from './personality-loader.ts';

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

// Personality now loads from database via personality-loader.ts

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
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

    // Load personality from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const systemPrompt = await loadPersonality(supabaseUrl, supabaseServiceKey);

    const hasSystemPrompt = messages.length > 0 && messages[0].role === 'system';
    const messagesWithSystem: ChatMessage[] = hasSystemPrompt
      ? messages
      : [{ role: 'system', content: systemPrompt }, ...messages];

    console.log('[openai-chat] systemPrompt: source=' + (hasSystemPrompt ? 'client' : 'db'));
    console.log('[openai-chat] Total messages:', messagesWithSystem.length);
    console.log('[openai-chat] Temperature:', temperature);

    if (stream) {
      console.log('[openai-chat] Streaming mode - tools disabled');

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: messagesWithSystem,
          max_tokens: 700,
          temperature: temperature,
          stream: true,
        }),
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error('OpenAI API error:', errorData);

        return new Response(
          JSON.stringify({ error: 'Failed to start stream' }),
          {
            status: openaiResponse.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const reader = openaiResponse.body?.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) {
            controller.close();
            return;
          }

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                controller.close();
                break;
              }

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim() !== '');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.substring(6);

                  if (data === '[DONE]') {
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                    continue;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;

                    if (content) {
                      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ token: content })}\n\n`));
                    }
                  } catch (e) {
                    console.warn('Failed to parse streaming chunk:', e);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: messagesWithSystem,
        max_tokens: 700,
        temperature: temperature,
        tools: PAT_TOOLS,
        tool_choice: 'auto'
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);

      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: errorData }),
        {
          status: openaiResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await openaiResponse.json();
    const firstChoice = data.choices?.[0];

    if (!firstChoice) {
      return new Response(
        JSON.stringify({ error: 'No response from OpenAI' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const toolCalls = firstChoice.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      console.log('[openai-chat] Tool calls detected:', toolCalls.length);
      const toolResults = [];

      for (const toolCall of toolCalls) {
        const { name, arguments: argsJson } = toolCall.function;
        console.log(`[openai-chat] Executing tool: ${name}`);

        try {
          const args = JSON.parse(argsJson);
          const result = await executeTool(name, args, effectiveUserId);
          toolResults.push({ name, result });
          console.log(`[openai-chat] Tool ${name} succeeded:`, result);
        } catch (err) {
          console.error(`[openai-chat] Tool ${name} failed:`, err);
          toolResults.push({ name, error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({
          message: firstChoice.message?.content || 'Action completed',
          tool_calls: toolResults,
          finish_reason: firstChoice.finish_reason
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: firstChoice.message?.content || 'No response',
        finish_reason: firstChoice.finish_reason
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);

    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});