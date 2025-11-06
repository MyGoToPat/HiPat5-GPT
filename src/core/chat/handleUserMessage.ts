/**
 * MAIN USER MESSAGE HANDLER
 * Coordinates intent detection, model selection, role execution, and LLM response
 */

import { detectIntent, shouldTriggerRole } from '../router/intentRouter';
import { selectModel, estimateCost, getModelDisplayName, type ModelSelection } from '../router/modelRouter';
import { type UserContext } from '../personality/patSystem';
import { ensureChatSession } from './sessions';
import { storeMessage, loadRecentMessages } from './store';
import { buildHistoryContext } from '../../lib/chatHistoryContext';
import { runPersonalityRouter } from '../personality/routerAgent';

/**
 * Strip leading style JSON from assistant responses
 * The post-executor sometimes emits style config blocks that should never be shown to users
 */
function stripLeadingStyleJSON(raw: string): string {
  if (!raw) return raw;
  const s = raw.trim();
  // quick detect: starts with "{" and contains style keys
  if (!s.startsWith('{')) return raw;

  // first try to parse the whole thing
  try {
    const obj = JSON.parse(s);
    const keys = obj && typeof obj === 'object' ? Object.keys(obj) : [];
    const looksLikeStyle =
      keys.length > 0 &&
      keys.every(k => ['tone', 'formality', 'jargon', 'greet_by_name_once'].includes(k));
    if (looksLikeStyle) return ''; // pure style block, drop it
  } catch {
    // fall through
  }

  // fallback: strip a leading {...} block if it mentions tone/formality
  const m = s.match(/^\s*\{[\s\S]*?\}\s*/);
  if (m && /"tone"|"formality"/.test(m[0])) {
    return s.slice(m[0].length).trim();
  }
  return raw;
}

export interface MessageContext {
  userId: string;
  userContext?: UserContext;
  messageHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  mode?: 'text' | 'voice';
  sessionId?: string; // Optional: provide existing session ID
}

export interface MessageResponse {
  response: string;
  intent: string;
  intentConfidence: number;
  modelUsed: string;
  estimatedCost: number;
  roleData?: any;
  toolCalls?: any;
  rawData?: any;
  blocked?: boolean;
}

/**
 * Main entry point for handling user messages
 */
export async function handleUserMessage(
  message: string,
  context: MessageContext
): Promise<MessageResponse> {
  // Step 0: Ensure chat session exists and load history
  const sessionId = context.sessionId || await ensureChatSession(context.userId);
  console.log('[handleUserMessage] Session ID:', sessionId);

  // Load recent message history if not provided (increased to 20 for better context)
  const messageHistory = context.messageHistory || await loadRecentMessages(sessionId, 20);
  console.log('[handleUserMessage] Message history loaded:', messageHistory.length, 'messages');

  // Step 1: Store user message
  await storeMessage(sessionId, 'user', message);

  // Step 1.5: Call Personality Router (LLM-aware intelligent routing)
  const routerDecision = await runPersonalityRouter(message);
  if (routerDecision) {
    console.info('[handleUserMessage] Personality router decision:', {
      intent: routerDecision.intent,
      route_to: routerDecision.route_to,
      use_gemini: routerDecision.use_gemini,
      reason: routerDecision.reason,
      confidence: routerDecision.confidence
    });
  }

  // Step 2: Detect intent (will use router decision if confidence >= 0.6)
  const intentResult = await detectIntent(message, routerDecision);
  console.log('[handleUserMessage] Intent detected:', intentResult);

  // Normalize intent names: 'food_log' → 'meal_logging'
  const normalizedIntent = intentResult.intent === 'food_log' ? 'meal_logging' : intentResult.intent;
  console.log('[handleUserMessage] Normalized intent:', normalizedIntent);

  // Step 2.5: UNIFIED NUTRITION PIPELINE
  // Handles both "food_question" (info-only) and "meal_logging" (with log button)
  if ((normalizedIntent === 'meal_logging' || normalizedIntent === 'food_question') && intentResult.confidence >= 0.5) {
    try {
      const { processNutrition } = await import('../nutrition/unifiedPipeline');
      
      // Determine if we should show the log button
      // food_question → info-only (show Edit/Cancel, but still allow logging)
      // meal_logging → full logging mode (show Log/Edit/Cancel)
      const showLogButton = normalizedIntent === 'meal_logging';
      
      console.log(`[nutrition] Intent: ${normalizedIntent}, showLogButton: ${showLogButton}`);
      
      const pipelineResult = await processNutrition({
        message,
        userId: context.userId,
        sessionId,
        showLogButton
      });
      
      if (pipelineResult.success && pipelineResult.roleData) {
        // Return the shape ChatPat expects: message.roleData.type === 'tmwya.verify'
        const result = {
          response: '', // No text, rendered as Verification Sheet
          intent: normalizedIntent,
          intentConfidence: intentResult.confidence,
          modelUsed: 'nutrition-unified',
          estimatedCost: 0,
          roleData: pipelineResult.roleData
        };
        
        console.log('[nutrition] roleData.type:', result.roleData?.type);
        
        // NO stub message - ChatPat will handle the verification card display
        // Storing a stub here creates ghost entries in chat history
        
        return result;
      } else {
        console.warn('[nutrition] Pipeline failed, falling back to general chat:', pipelineResult.error);
        // Fall through to general chat/AMA fallback below
      }
    } catch (e) {
      console.warn('[nutrition] Processing failed, falling back to general chat:', e);
      // Fall through to general chat fallback below
    }
  }

  // Step 3: Select model (with personality router hints)
  const modelSelection: ModelSelection = selectModel({
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    messageLength: message.length,
    requiresStructuredOutput: shouldTriggerRole(intentResult.intent),
    forceOpenAI: intentResult.metadata?.use_openai === true,
    needsWeb: intentResult.metadata?.needs_web === true,
    wantsLinks: intentResult.metadata?.wants_links === true,
    depth: intentResult.metadata?.depth || 'brief',
    hints: routerDecision ? {
      use_gemini: routerDecision.use_gemini,
      confidence: routerDecision.confidence,
      reason: routerDecision.reason
    } : undefined
  });

  const cost = estimateCost(modelSelection);
  console.log('[handleUserMessage] Model selected:', getModelDisplayName(modelSelection), `(~$${cost.toFixed(4)})`);
  console.info('[handleUserMessage] Router decision used:', routerDecision ? 'yes' : 'no');

  // Step 4: Check if we should trigger a role
  let roleData: any = null;

  if (shouldTriggerRole(intentResult.intent)) {
    // TODO: Load role manifest and execute role handler
    console.log('[handleUserMessage] Role trigger needed:', intentResult.intent);
    // roleData = await executeRole(intentResult.intent, message, context);
  }

  // Step 5: Build system prompt with user context
  // All intents now route through swarm system (including general → personality swarm)
  let systemPrompt: string;
  let swarm: any = null;

  try {
    const { getSwarmForIntent, buildSwarmPrompt } = await import('../swarm/loader');

    swarm = await getSwarmForIntent(intentResult.intent);

    if (!swarm) {
      // No swarm matched; force-load personality swarm as fallback
      console.warn('[routing] No swarm matched; falling back to personality swarm');
      swarm = await getSwarmForIntent('general');
    }

    if (swarm) {
      console.log(`[handleUserMessage] Using swarm: ${swarm.swarm_name}`);
      systemPrompt = await buildSwarmPrompt(swarm, context.userContext);
    } else {
      throw new Error('Personality swarm not configured');
    }
  } catch (err) {
    console.error('[handleUserMessage] Swarm load failed, using minimal emergency prompt:', err);
    systemPrompt = 'You are Pat. Speak clearly and concisely.';
  }

  // Inject lightweight history context (recent conversation snippet)
  const historyCtx = await buildHistoryContext(context.userId, sessionId);
  if (historyCtx) {
    systemPrompt += `\n\n${historyCtx}`;
    console.log('[handleUserMessage] Added history context, length:', historyCtx.length);
  }

  // Step 5.5: AMA fallback for meal logging when TMWYA not available
  if (intentResult.intent === 'meal_logging' && intentResult.confidence >= 0.5) {
    try {
      const { portionResolver } = await import('../../agents/shared/nutrition/portionResolver');
      const { macroLookup } = await import('../../agents/shared/nutrition/macroLookup');
      const { computeTEF } = await import('../../agents/tmwya/tef');
      const { computeTDEE } = await import('../../agents/tmwya/tdee');
      
      const naiveItems = message.split(/,| and | with | plus /i)
        .map(s => ({ name: s.trim(), amount: null as number | null, unit: null as string | null }))
        .filter(x => x.name.length > 0);
      
      const portioned = portionResolver(naiveItems);
      const estimate = await macroLookup(portioned);
      const tef = computeTEF(estimate.totals);
      const tdee = await computeTDEE(context.userId, estimate.totals, tef, new Date().toISOString());
      
      // Add macro info to system prompt for Personality to use
      systemPrompt += `\n\nUser just logged a meal. Here are the macros including fiber:
Total calories: ${estimate.totals.calories} kcal
Protein: ${estimate.totals.protein_g}g, Carbs: ${estimate.totals.carbs_g}g, Fat: ${estimate.totals.fat_g}g, Fiber: ${estimate.totals.fiber_g}g
TEF: ${tef.kcal} kcal
Remaining for today: ${tdee.remaining_kcal} kcal (${tdee.remaining_percentage.toFixed(1)}%)
Please acknowledge this meal logging and provide a brief summary.`;
      
      console.log('[AMA Fallback] Added meal data to prompt:', estimate.totals);
    } catch (e) {
      console.warn('[AMA Fallback] Failed to add meal data:', e);
    }
  }

  // Step 6: Call LLM (placeholder - will be implemented with actual API calls)
  const llmResult = await callLLM({
    system: systemPrompt,
    userMessage: message,
    messageHistory,
    roleData,
    modelSelection,
    userId: context.userId,
  });

  let llmResponse = typeof llmResult === 'string' ? llmResult : llmResult.message;
  const toolCalls = typeof llmResult === 'object' ? llmResult.tool_calls : null;
  const rawData = typeof llmResult === 'object' ? llmResult.raw_data : null;

  // Step 6.5: Execute post-agents if swarm has them (personality polish)
  // CRITICAL: Skip post-polish for structured data (Verification Sheets)
  const postMode = (import.meta?.env?.VITE_PERSONALITY_POST_EXECUTOR ?? 'combined') as 'combined' | 'sequential' | 'off';
  if (swarm?.agents?.some((a: any) => a.phase === 'post' && a.enabled)) {
    try {
      const { executePostAgents } = await import('../swarm/executor');
      // Pass roleData.type to skip polishing structured nutrition data
      const roleDataType = roleData?.type;
      const refined = await executePostAgents(llmResponse, swarm, context.userContext, postMode, roleDataType);
      console.log(`[personality-post] mode=${postMode}, roleDataType=${roleDataType ?? 'none'}, original=${llmResponse.length}, refined=${refined.length}`);
      llmResponse = refined;
    } catch (postError) {
      console.error('[personality-post] Post-agent execution failed, using original response:', postError);
      // Continue with original response
    }
  }

  // Strip any style JSON blocks that leaked through
  let assistantText = llmResponse ?? '';
  assistantText = stripLeadingStyleJSON(assistantText);

  // Graceful fallback: if the reply was ONLY style JSON, avoid showing nonsense
  if (!assistantText) {
    assistantText = "Okay — how can I help?";
  }

  // Step 7: Store assistant response
  await storeMessage(sessionId, 'assistant', assistantText);

  return {
    response: assistantText,
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    modelUsed: getModelDisplayName(modelSelection),
    estimatedCost: cost,
    roleData,
    toolCalls,
    rawData,
  };
}

interface LLMCallParams {
  system: string;
  userMessage: string;
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  roleData: any;
  modelSelection: ModelSelection;
  userId: string;
}

/**
 * Call LLM with prepared context via OpenAI edge function
 */
async function callLLM(params: LLMCallParams): Promise<{ message: string; tool_calls?: any; raw_data?: any }> {
  const { system, userMessage, messageHistory, roleData, modelSelection, userId } = params;

  console.log('[callLLM] Calling', getModelDisplayName(modelSelection));
  console.log('[callLLM] System prompt length:', system.length);
  console.log('[callLLM] Message history:', messageHistory.length, 'messages');
  console.log('[callLLM] Last 3 messages:', messageHistory.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 50)}...`));
  console.log('[callLLM] Role data:', roleData ? 'present' : 'none');

  // Build messages array for OpenAI
  const messages = [
    { role: 'system' as const, content: system },
    ...messageHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user' as const, content: userMessage }
  ];

  // ✅ Route to correct edge function based on provider
  const { getSupabase } = await import('../../lib/supabase');
  const supabase = getSupabase();

  // ✅ Route by provider: gemini → gemini-chat, openai → openai-chat
  const edgeFunction = modelSelection.provider === 'gemini' 
    ? 'gemini-chat' 
    : 'openai-chat';
  
  console.info('[callLLM] Invoking edge function:', edgeFunction, 'provider:', modelSelection.provider);
  console.info('[callLLM] Final function:', edgeFunction, { provider: modelSelection.provider, model: modelSelection.model });

  const { data, error } = await supabase.functions.invoke(edgeFunction, {
    body: {
      messages,
      stream: false,
      userId,
      temperature: modelSelection.temperature ?? 0.3,
      model: modelSelection.model,
      provider: modelSelection.provider
    }
  });

  if (error) {
    console.error('[callLLM] Edge function error:', error);
    throw new Error('Failed to get response from AI assistant');
  }

  if (!data?.message) {
    console.error('[callLLM] No message in response:', data);
    throw new Error('No response from AI assistant');
  }

  console.log('[callLLM] Response received, length:', data.message.length);
  if (data.tool_calls) {
    console.log('[callLLM] Tools executed:', data.tool_calls);
  }
  return { message: data.message, tool_calls: data.tool_calls, raw_data: data };
}

