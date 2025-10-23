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
    const { messages, stream = false, userId }: ChatRequest = await req.json();

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

    if (stream) {
      console.log('[openai-chat] Streaming mode - tools disabled');

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messagesWithSystem,
          max_tokens: 700,
          temperature: 0.3,
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
        model: 'gpt-4o-mini',
        messages: messagesWithSystem,
        max_tokens: 700,
        temperature: 0.3,
        tools: PAT_TOOLS,
        tool_choice: 'auto'
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);

      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'I\'m a bit busy right now. Please try again in a moment.' }),
          {
            status: 429,
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

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices?.[0]?.message;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('OpenAI Chat - Usage:', {
      input_tokens: openaiData.usage?.prompt_tokens,
      output_tokens: openaiData.usage?.completion_tokens,
      total_tokens: openaiData.usage?.total_tokens,
      timestamp: new Date().toISOString()
    });

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseClient = createClient(supabaseUrl, supabaseKey);

      const { data: flag } = await supabaseClient
        .from('feature_flags')
        .select('enabled')
        .eq('key', 'log_tool_telemetry_db')
        .maybeSingle();

      if (flag?.enabled) {
        const TOOL_TO_ROLE_MAP: Record<string, string> = {
          'log_meal': 'tmwya',
          'get_macros': 'macro',
          'get_remaining_macros': 'macro',
          'undo_last_meal': 'tmwya',
        };

        const userMessage = messages[messages.length - 1]?.content || '';
        const toolName = assistantMessage.tool_calls?.[0]?.function?.name || null;
        const roleTarget = toolName ? (TOOL_TO_ROLE_MAP[toolName] || 'unknown') : 'persona';
        const personaFallback = toolName === null;

        console.log('[tool-route]', JSON.stringify({
          ts: new Date().toISOString(),
          msgPreview: userMessage.slice(0, 120),
          toolName,
          roleTarget,
          personaFallback
        }));

        await supabaseClient.from('admin_action_logs').insert({
          actor_uid: effectiveUserId || '00000000-0000-0000-0000-000000000000',
          action: 'tool_route',
          target: 'openai-chat',
          payload: {
            msgPreview: userMessage.slice(0, 120),
            toolName,
            roleTarget,
            personaFallback,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (telemetryError) {
      console.error('[telemetry] Failed to log tool route:', telemetryError);
    }

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('[openai-chat] Tool calls detected:', assistantMessage.tool_calls.length);

      if (!effectiveUserId) {
        return new Response(
          JSON.stringify({ error: 'User authentication required for tool execution' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const toolResults = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[openai-chat] Executing tool: ${toolName}`);

        const result = await executeTool(toolName, toolArgs, {
          userId: effectiveUserId,
          supabaseUrl: Deno.env.get('SUPABASE_URL')!,
          supabaseKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        });

        toolResults.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: toolName,
          content: JSON.stringify(result)
        });
      }

      const followUpMessages = [
        ...messagesWithSystem,
        assistantMessage,
        ...toolResults
      ];

      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: followUpMessages,
          max_tokens: 700,
          temperature: 0.3,
        }),
      });

      if (!followUpResponse.ok) {
        console.error('[openai-chat] Follow-up call failed');
        return new Response(
          JSON.stringify({ error: 'Failed to process tool results' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const followUpData = await followUpResponse.json();
      const finalMessage = followUpData.choices?.[0]?.message?.content;

      return new Response(
        JSON.stringify({
          message: finalMessage,
          tool_calls: assistantMessage.tool_calls.map((tc: any) => tc.function.name),
          usage: {
            prompt_tokens: openaiData.usage?.prompt_tokens + followUpData.usage?.prompt_tokens,
            completion_tokens: openaiData.usage?.completion_tokens + followUpData.usage?.completion_tokens,
            total_tokens: openaiData.usage?.total_tokens + followUpData.usage?.total_tokens
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage.content,
        usage: openaiData.usage
      }),
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
