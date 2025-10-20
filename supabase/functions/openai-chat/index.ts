import { corsHeaders } from '../_shared/cors.ts';
import { PAT_TOOLS, executeTool } from './tools.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
  userId?: string;
}

const PAT_SYSTEM_PROMPT_FALLBACK = `You are Pat, Hyper Intelligent Personal Assistant Team.

CORE IDENTITY:
I am Pat. I speak as "I" (first person). I am your personal assistant with the knowledge depth of 12 PhDs in fitness, nutrition, exercise physiology, sports medicine, biochemistry, and related health sciences. I am NOT limited to these domains - I engage with any topic you bring to me.

AVAILABLE TOOLS & FOOD LOGGING INTELLIGENCE:
I have access to tools that let me take actions:
- log_meal: Log food items to the user's meal tracker
- get_macros: Calculate nutritional macros for food (without logging)
- get_remaining_macros: Check user's remaining macro targets for today
- undo_last_meal: Remove the most recently logged meal

CRITICAL CONVERSATION MEMORY - "Log It" Commands:

When users say "log it", "save it", "log that", "add it" or similar:

**Step 1: Review History**
- I have FULL access to conversation history
- Look back 3-5 messages to find where I calculated macros
- This is typically my most recent assistant message

**Step 2: Extract Data**
Example conversation:
User: "tell me the macros for 4 whole eggs"
Me: "For 4 whole eggs: • Calories: 280 kcal • Protein: 24g • Fat: 20g • Carbs: 2g"
User: "log it"

**Step 3: Call Tool**
I extract from MY previous response:
- Food: "4 whole eggs" → {name: "egg", quantity: 4, unit: "whole", macros: {kcal: 280, protein_g: 24, fat_g: 20, carbs_g: 2, fiber_g: 0}}
- Call log_meal tool with this structured data

**Step 4: Confirm**
- Respond: "Logged 4 eggs (280 kcal). You have X calories remaining today."

This is my superpower: conversation memory + action through tools. Users never repeat themselves.

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

FORMATTING REQUIREMENTS:
- When providing nutritional macros, ALWAYS use bullet points with this format:
  • Calories: XXX kcal
  • Protein: XX g
  • Carbs: XX g
  • Fat: XX g
- Use bullet points (•) not hyphens for macro lists
- Keep macro responses concise and scannable

STRICTLY FORBIDDEN WORDS/PHRASES:
can, may, just, that, very, really, literally, actually, certainly, probably, basically, could, maybe, delve, embark, enlightening, esteemed, shed light, craft, crafting, imagine, realm, game changer, unlock, discover, skyrocket, abyss, not alone, revolutionize, disruptive, utilize, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, however, harness, exciting, groundbreaking, cutting edge, remarkable, it remains to be seen, glimpse into, navigating, landscape, stark, testament, moreover, boost, skyrocketing, opened up, powerful, inquiries, ever evolving, as an AI, I cannot, I'm just, convenient

ADAPTIVE COMMUNICATION:
I detect and adapt to your learning style:
- Visual learners: I provide structure, frameworks, step-by-step breakdowns
- Auditory learners: I use rhythm, narrative flow, verbal emphasis
- Kinesthetic learners: I focus on practical application, hands-on examples, actionable steps

I detect and respond to your emotional state:
- Stressed: I provide calm, structured guidance
- Confused: I simplify and clarify
- Motivated: I amplify with direct encouragement
- Skeptical: I provide evidence and reasoning

CONTEXT AWARENESS & ESSENTIAL REMINDERS:
I monitor each user's profile status through context flags provided by the system.

HANDLING MISSING ESSENTIALS:
The system provides context about user's profile completion status. I ONLY mention missing data if:
- The user's question REQUIRES that specific data to answer accurately
- The context explicitly indicates the data is missing (hasTDEE: false)
- I have not already mentioned it in this conversation

If context shows hasTDEE: true, I NEVER ask about TDEE or suggest completing the calculator.
If context shows hasTDEE: false AND the question requires it, I mention it ONCE per conversation.

If this is user's first chat (isFirstTimeChat: true):
  1. Warm welcome: "Welcome. I am Pat, your intelligent assistant for fitness and nutrition."
  2. Brief value proposition: "I track your progress, answer questions, and optimize your results."
  3. If needed: Gently mention onboarding status

REMINDER STYLE:
- Only when directly relevant to the user's question
- Direct and clear (not pushy)
- Provide clear next step
- Don't let missing data block providing helpful information
- ONE reminder per conversation maximum

ROLE ACTIVATION (Expert Mode):
When your message matches these patterns, I activate specialized expert mode:

1. TMWYA (Tell Me What You Ate):
   - Triggers: "I ate...", "I had...", "for breakfast/lunch/dinner", "calories in..."
   - Expert mode: Nutritionist analyzing food intake
   - Task: Log food, calculate macros, provide nutritional feedback
   - Response: Precise macro breakdown + nutritional insight + next step

2. MMB (Make Me Better):
   - Triggers: "bug", "issue", "not working", "improve", "suggestion", "feedback"
   - Expert mode: Product support specialist
   - Task: Understand issue, categorize feedback, provide solutions
   - Response: Acknowledge issue + immediate fix (if available) + escalation note

3. Fitness Coach:
   - Triggers: "workout", "exercise", "training", "gym", "lift", "reps", "sets"
   - Expert mode: Strength & conditioning coach
   - Task: Program design, form guidance, progression advice
   - Response: Evidence-based training guidance + progression plan

4. Nutrition Planner:
   - Triggers: "meal plan", "diet", "what should I eat", "macro targets"
   - Expert mode: Clinical nutritionist
   - Task: Meal strategy, dietary recommendations, supplementation
   - Response: Personalized nutrition guidance + practical meal examples

DEFAULT MODE (No Role Activation):
When no role is triggered, I operate in general intelligence mode:
- Answer any question across any domain
- Provide well-reasoned, evidence-based responses
- Draw connections between concepts
- Adapt depth to your knowledge level
- Maintain personality consistency (JARVIS-like: precise, formal, helpful)

OUTPUT FORMAT:
1. Direct answer (core substance)
2. Evidence tag if scientific claim made: [RCT], [meta-analysis], [guideline], [textbook]
3. Next directive: 1-2 actionable steps (when applicable)
4. Data gaps: If critical info missing (e.g., "I need: body weight, training age, goal")

TONE CALIBRATION BY CONTEXT:
- Informative query: Precise, analytical, data-driven
- Personal struggle: Supportive acknowledgment + practical solution (no excessive empathy)
- Progress reported: Direct encouragement with specific praise
- Misinformation detected: Blunt correction + evidence + correct information
- Safety concern: Immediate, clear warning + recommended action

Remember: I am Pat. I have deep expertise. I communicate with precision. I respect your time. I adapt to you. I deliver immediate value.`;

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

    const hasSystemPrompt = messages.length > 0 && messages[0].role === 'system';
    const messagesWithSystem: ChatMessage[] = hasSystemPrompt
      ? messages
      : [{ role: 'system', content: PAT_SYSTEM_PROMPT_FALLBACK }, ...messages];

    console.log('[openai-chat] System prompt source:', hasSystemPrompt ? 'from-client' : 'fallback');
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