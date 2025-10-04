const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
}

interface QueryClassification {
  needsInternet: boolean;
  confidence: number;
  reasoning: string;
  provider: 'openai' | 'gemini';
}

// CRITICAL: Strict system prompt that ONLY returns bullets for macro requests
const PAT_SYSTEM_PROMPT = `You are Pat, a fitness and nutrition AI assistant.

CRITICAL RULE - MACRO REQUESTS:
When user asks for macros/calories of food (e.g., "give me the macros of X", "calories in X", "nutrition for X"), respond with ONLY this format:

• Calories: XXX kcal
• Protein: XX g
• Carbs: XX g
• Fat: XX g

Log

NO OTHER TEXT. No explanations, no greetings, no suggestions. Just bullets and "Log".

Examples:
User: "give me the macros of a Big Mac"
Pat:
• Calories: 550 kcal
• Protein: 25 g
• Carbs: 45 g
• Fat: 30 g

Log

User: "what are the macros of 3 egg whites"
Pat:
• Calories: 51 kcal
• Protein: 10.8 g
• Carbs: 0.7 g
• Fat: 0.2 g

Log

For all other questions, respond conversationally but concisely (under 200 words).

NEVER mention TDEE calculator unless user specifically asks about calorie needs or weight goals.`;

function classifyQuery(userMessage: string): QueryClassification {
  const message = userMessage.toLowerCase();

  // Detect macro requests - these should ALWAYS use OpenAI for consistent formatting
  const isMacroRequest =
    /(?:give me|show me|what are|tell me|what's)?\s*(?:the)?\s*macros?\s+(?:of|for|in)/i.test(message) ||
    /calories?\s+(?:in|for|of)/i.test(message);

  if (isMacroRequest) {
    return {
      needsInternet: false,
      confidence: 1.0,
      reasoning: 'Macro request - use OpenAI for bullet-only response',
      provider: 'openai'
    };
  }

  // Internet keywords suggest using Gemini with grounding
  const internetKeywords = ['supplement', 'research', 'study', 'clinical trial', 'latest', 'recent',
    'current', '2024', '2025', 'new', 'brand', 'product', 'review', 'nmn', 'creatine', 'turkesterone',
    'ashwagandha', 'whey', 'protein powder', 'pre-workout', 'bcaa', 'glutamine', 'compare', 'vs',
    'best', 'what do you think about', 'tell me about', 'effective', 'worth it', 'does it work',
    'science behind', 'evidence for', 'mcdonalds', 'burger king', 'wendys', 'taco bell', 'chipotle',
    'subway', 'starbucks', 'dunkin', 'fast food'];

  const internetScore = internetKeywords.reduce((score, keyword) =>
    score + (message.includes(keyword) ? 1 : 0), 0);

  if (internetScore > 0) {
    return {
      needsInternet: true,
      confidence: Math.min(internetScore / 3, 1),
      reasoning: 'Query about supplements, brands, or current information',
      provider: 'gemini'
    };
  }

  // Default to OpenAI for general fitness/nutrition questions
  return {
    needsInternet: false,
    confidence: 0.5,
    reasoning: 'General query - using fast provider',
    provider: 'openai'
  };
}

async function callOpenAI(messages: ChatMessage[], stream: boolean, openaiApiKey: string) {
  const messagesWithSystem: ChatMessage[] = [
    { role: 'system', content: PAT_SYSTEM_PROMPT },
    ...messages
  ];

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messagesWithSystem,
      max_tokens: 500,
      temperature: 0.2,
      stream: stream
    })
  });

  return openaiResponse;
}

async function callGemini(messages: ChatMessage[], geminiApiKey: string) {
  const systemPrompt = PAT_SYSTEM_PROMPT;
  const conversationHistory = messages.map(msg => {
    if (msg.role === 'user') return `User: ${msg.content}`;
    else if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
    return '';
  }).filter(Boolean).join('\n\n');

  const fullPrompt = `${systemPrompt}\n\n${conversationHistory}`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 700
        }
      })
    }
  );

  if (!geminiResponse.ok) {
    const errorData = await geminiResponse.text();
    console.error('Gemini API error:', errorData);
    throw new Error(`Gemini API error: ${geminiResponse.status}`);
  }

  const geminiData = await geminiResponse.json();
  const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  const groundingMetadata = geminiData.candidates?.[0]?.groundingMetadata;

  if (!content) throw new Error('No response from Gemini');

  let finalContent = content;
  if (groundingMetadata?.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
    finalContent += '\n\n---\n*Sources: Based on current web search*';
  }

  return {
    message: finalContent,
    usage: {
      prompt_tokens: geminiData.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiData.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiData.usageMetadata?.totalTokenCount || 0
    },
    provider: 'gemini',
    groundingUsed: !!groundingMetadata?.webSearchQueries
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages, stream = false }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: 'No user message found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const classification = classifyQuery(lastUserMessage.content);
    console.log('Query Classification:', {
      provider: classification.provider,
      needsInternet: classification.needsInternet,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      query: lastUserMessage.content.substring(0, 100)
    });

    // Use Gemini for internet-required queries
    if (classification.needsInternet && geminiApiKey) {
      try {
        const geminiResult = await callGemini(messages, geminiApiKey);
        console.log('Gemini Response - Usage:', {
          input_tokens: geminiResult.usage.prompt_tokens,
          output_tokens: geminiResult.usage.completion_tokens,
          total_tokens: geminiResult.usage.total_tokens,
          grounding_used: geminiResult.groundingUsed,
          timestamp: new Date().toISOString()
        });

        return new Response(
          JSON.stringify({
            message: geminiResult.message,
            usage: geminiResult.usage,
            provider: 'gemini',
            classification: classification
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Gemini error, falling back to OpenAI:', error);
      }
    }

    // Streaming for OpenAI
    if (stream) {
      const openaiResponse = await callOpenAI(messages, true, openaiApiKey);

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.text();
        console.error('OpenAI API error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to start stream' }),
          { status: openaiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const reader = openaiResponse.body?.getReader();
      const decoder = new TextDecoder();

      const streamResponse = new ReadableStream({
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
                      controller.enqueue(
                        new TextEncoder().encode(`data: ${JSON.stringify({ token: content })}\n\n`)
                      );
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
        }
      });

      return new Response(streamResponse, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Non-streaming OpenAI
    const openaiResponse = await callOpenAI(messages, false, openaiApiKey);

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);

      if (openaiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'I\'m a bit busy right now. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'I\'m having trouble connecting right now. Please try again later.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OpenAI Response - Usage:', {
      input_tokens: openaiData.usage?.prompt_tokens,
      output_tokens: openaiData.usage?.completion_tokens,
      total_tokens: openaiData.usage?.total_tokens,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        message: assistantMessage,
        usage: openaiData.usage,
        provider: 'openai',
        classification: classification
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in intelligent-chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
