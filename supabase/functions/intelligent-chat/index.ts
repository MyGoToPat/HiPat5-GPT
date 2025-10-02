import { corsHeaders } from '../_shared/cors.ts';

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

const PAT_SYSTEM_PROMPT = `You are Pat, Hyper Intelligent Personal Assistant Team.

CORE IDENTITY:
I am Pat. I speak as "I" (first person). I am your personal assistant with the knowledge depth of 12 PhDs in fitness, nutrition, exercise physiology, sports medicine, biochemistry, and related health sciences. I am NOT limited to these domains - I engage with any topic you bring to me.

KNOWLEDGE BASE (Core Expertise):
- Exercise Physiology: Training adaptations, periodization, biomechanics, muscle physiology
- Nutrition Science: Macronutrient metabolism, micronutrients, digestive physiology, energy balance
- Sports Medicine: Injury prevention, recovery protocols, performance optimization
- Biochemistry: Metabolic pathways, hormonal systems, cellular signaling
- Behavioral Psychology: Habit formation, motivation, adherence strategies
- General Intelligence: Broad knowledge across sciences, business, technology, human performance

I answer questions with the precision of an academic researcher and the practicality of a field practitioner. I cite evidence when making claims. I acknowledge uncertainty when appropriate.

COMMUNICATION STYLE (Spartan & Precise):
- Clear, simple language
- Short, impactful sentences
- Active voice only
- Practical, actionable insights
- Support claims with data from research, clinical practice, or field evidence
- Correct misinformation with evidence-based information
- Commas or periods ONLY (no em dashes, semicolons)
- NO metaphors, clichés, generalizations, setup phrases
- NO unnecessary adjectives/adverbs
- Target: 160-220 words for standard responses
- Simple queries: 20-50 words maximum
- Complex topics: Up to 300 words when depth is required

When providing information from recent research or web sources, ALWAYS include citations with links.`;

/**
 * Classify user query to determine if it needs internet access
 */
function classifyQuery(userMessage: string): QueryClassification {
  const message = userMessage.toLowerCase();

  // Strong indicators for internet search (supplements, current info, research)
  const internetKeywords = [
    'supplement', 'research', 'study', 'clinical trial', 'latest', 'recent',
    'current', '2024', '2025', 'new', 'brand', 'product', 'review',
    'nmn', 'creatine', 'turkesterone', 'ashwagandha', 'whey', 'protein powder',
    'pre-workout', 'bcaa', 'glutamine', 'compare', 'vs', 'best',
    'what do you think about', 'tell me about', 'effective', 'worth it',
    'does it work', 'science behind', 'evidence for'
  ];

  // Strong indicators for static knowledge (no internet needed)
  const staticKeywords = [
    'i ate', 'i had', 'breakfast', 'lunch', 'dinner', 'calories in',
    'macro', 'macros', 'protein', 'carbs', 'fat', 'chicken breast',
    'bench press', 'squat', 'deadlift', 'form', 'technique',
    'workout plan', 'exercise', 'reps', 'sets', 'training split',
    'tdee', 'bmr', 'body fat', 'muscle gain', 'weight loss'
  ];

  // Check for internet indicators
  const internetScore = internetKeywords.reduce((score, keyword) => {
    return score + (message.includes(keyword) ? 1 : 0);
  }, 0);

  // Check for static knowledge indicators
  const staticScore = staticKeywords.reduce((score, keyword) => {
    return score + (message.includes(keyword) ? 1 : 0);
  }, 0);

  // Decision logic
  if (internetScore > staticScore && internetScore > 0) {
    return {
      needsInternet: true,
      confidence: Math.min(internetScore / 3, 1),
      reasoning: 'Query about supplements, research, or current information',
      provider: 'gemini'
    };
  }

  if (staticScore > internetScore && staticScore > 0) {
    return {
      needsInternet: false,
      confidence: Math.min(staticScore / 3, 1),
      reasoning: 'Query about established knowledge (food, exercise, physiology)',
      provider: 'openai'
    };
  }

  // Default to OpenAI for ambiguous queries (faster, cheaper)
  return {
    needsInternet: false,
    confidence: 0.5,
    reasoning: 'Ambiguous query - using fast provider',
    provider: 'openai'
  };
}

/**
 * Call OpenAI API (existing implementation)
 */
async function callOpenAI(messages: ChatMessage[], stream: boolean, openaiApiKey: string) {
  const messagesWithSystem: ChatMessage[] = [
    { role: 'system', content: PAT_SYSTEM_PROMPT },
    ...messages
  ];

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
      stream: stream,
    }),
  });

  return openaiResponse;
}

/**
 * Call Gemini API with Google Search grounding
 */
async function callGemini(messages: ChatMessage[], geminiApiKey: string) {
  // Combine system prompt and messages
  const systemPrompt = PAT_SYSTEM_PROMPT;
  const conversationHistory = messages.map(msg => {
    if (msg.role === 'user') {
      return `User: ${msg.content}`;
    } else if (msg.role === 'assistant') {
      return `Assistant: ${msg.content}`;
    }
    return '';
  }).filter(Boolean).join('\n\n');

  const fullPrompt = `${systemPrompt}\n\n${conversationHistory}`;

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        tools: [{
          googleSearch: {}
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 700,
        }
      }),
    }
  );

  if (!geminiResponse.ok) {
    const errorData = await geminiResponse.text();
    console.error('Gemini API error:', errorData);
    throw new Error(`Gemini API error: ${geminiResponse.status}`);
  }

  const geminiData = await geminiResponse.json();

  // Extract text from Gemini response
  const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
  const groundingMetadata = geminiData.candidates?.[0]?.groundingMetadata;

  if (!content) {
    throw new Error('No response from Gemini');
  }

  // Add source citations if grounding was used
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, stream = false }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get API keys from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!geminiApiKey) {
      console.warn('Gemini API key not configured - falling back to OpenAI only');
    }

    // Get the last user message for classification
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: 'No user message found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Classify the query
    const classification = classifyQuery(lastUserMessage.content);

    console.log('Query Classification:', {
      provider: classification.provider,
      needsInternet: classification.needsInternet,
      confidence: classification.confidence,
      reasoning: classification.reasoning,
      query: lastUserMessage.content.substring(0, 100)
    });

    // Route to appropriate AI provider
    if (classification.needsInternet && geminiApiKey) {
      // Use Gemini with Google Search
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
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('Gemini error, falling back to OpenAI:', error);
        // Fall through to OpenAI
      }
    }

    // Use OpenAI (default or fallback)
    if (stream) {
      const openaiResponse = await callOpenAI(messages, true, openaiApiKey);

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

      // Create readable stream for SSE
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

      return new Response(streamResponse, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
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
    const assistantMessage = openaiData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in intelligent-chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});