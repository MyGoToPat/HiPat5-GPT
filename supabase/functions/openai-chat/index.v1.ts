const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

import { isMealLoggingIntent, isMacroQuestion, parseMealWithOpenAI } from './mealParser.ts';
import { handleMealLogging } from './mealHandler.ts';
import type { FoodLogResponse } from '../../../src/types/foodlog.ts';

interface ChatRequest {
  messages: Array<{role: string; content: string}>;
  userId?: string;
  stream?: boolean;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Health check
    if (url.searchParams.get('health') === '1') {
      const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY');
      const hasGemini = !!Deno.env.get('GEMINI_API_KEY');
      return new Response(
        JSON.stringify({ ok: true, hasOpenAI, hasGemini }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: ChatRequest = await req.json();
    const { messages, userId, stream } = body;

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get last user message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return new Response(
        JSON.stringify({ error: 'No user message found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userText = lastUserMessage.content;

    console.log('[openai-chat] Processing:', userText.substring(0, 100));

    // MEAL LOGGING V1 ROUTING
    if (isMealLoggingIntent(userText)) {
      console.log('[openai-chat] Detected meal logging intent');

      // Parse meal with OpenAI
      const parsedMeal = await parseMealWithOpenAI(userText);

      if (parsedMeal.items.length === 0) {
        // Parsing failed - fall back to normal chat
        console.log('[openai-chat] Meal parsing failed, falling back to chat');
        return await handleNormalChat(messages, userId, stream);
      }

      // Handle meal logging with V1 system
      const result: FoodLogResponse = await handleMealLogging(userText, userId, parsedMeal);

      // Return structured response
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MACRO QUESTION (not logging)
    if (isMacroQuestion(userText)) {
      console.log('[openai-chat] Detected macro question');

      const parsedMeal = await parseMealWithOpenAI(userText);

      if (parsedMeal.items.length > 0) {
        // Calculate and return macros without logging
        const totals = parsedMeal.items.reduce(
          (sum, item) => ({
            calories: sum.calories + (item.macros?.calories || 0),
            protein: sum.protein + (item.macros?.protein || 0),
            carbs: sum.carbs + (item.macros?.carbs || 0),
            fat: sum.fat + (item.macros?.fat || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

        const macroText = `For ${userText}:\n• Calories: ${Math.round(totals.calories)} kcal\n• Protein: ${Math.round(totals.protein)}g\n• Carbs: ${Math.round(totals.carbs)}g\n• Fat: ${Math.round(totals.fat)}g`;

        return new Response(
          JSON.stringify({
            ok: true,
            kind: 'macro_info',
            message: macroText,
            macros: totals,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // NORMAL CHAT
    return await handleNormalChat(messages, userId, stream);
  } catch (error) {
    console.error('[openai-chat] Error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Handle normal conversational chat (non-meal-logging)
 */
async function handleNormalChat(
  messages: Array<{role: string; content: string}>,
  userId: string,
  stream?: boolean
): Promise<Response> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const systemPrompt = {
    role: 'system',
    content: 'You are Pat, a helpful fitness and nutrition assistant. Be concise and supportive.',
  };

  const messagesWithSystem = messages[0]?.role === 'system'
    ? messages
    : [systemPrompt, ...messages];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messagesWithSystem,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const reply = data.choices[0].message.content;

  return new Response(
    JSON.stringify({
      ok: true,
      kind: 'general',
      message: reply,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
