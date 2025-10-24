/**
 * MAIN USER MESSAGE HANDLER
 * Coordinates intent detection, model selection, role execution, and LLM response
 */

import { detectIntent, shouldTriggerRole } from '../router/intentRouter';
import { selectModel, estimateCost, getModelDisplayName, type ModelSelection } from '../router/modelRouter';
import { type UserContext } from '../personality/patSystem';
import { ensureChatSession } from './sessions';
import { storeMessage, loadRecentMessages } from './store';

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

  // Step 2: Detect intent
  const intentResult = await detectIntent(message);
  console.log('[handleUserMessage] Intent detected:', intentResult);

  // Step 3: Select model
  const modelSelection: ModelSelection = selectModel({
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    messageLength: message.length,
    requiresStructuredOutput: shouldTriggerRole(intentResult.intent),
    forceOpenAI: intentResult.metadata?.use_openai === true,
  });

  const cost = estimateCost(modelSelection);
  console.log('[handleUserMessage] Model selected:', getModelDisplayName(modelSelection), `(~$${cost.toFixed(4)})`);

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
  const postMode = (import.meta?.env?.VITE_PERSONALITY_POST_EXECUTOR ?? 'combined') as 'combined' | 'sequential' | 'off';
  if (swarm?.agents?.some((a: any) => a.phase === 'post' && a.enabled)) {
    try {
      const { executePostAgents } = await import('../swarm/executor');
      const refined = await executePostAgents(llmResponse, swarm, context.userContext, postMode);
      console.log(`[personality-post] mode=${postMode}, original=${llmResponse.length}, refined=${refined.length}`);
      llmResponse = refined;
    } catch (postError) {
      console.error('[personality-post] Post-agent execution failed, using original response:', postError);
      // Continue with original response
    }
  }

  // Step 7: Store assistant response
  await storeMessage(sessionId, 'assistant', llmResponse);

  return {
    response: llmResponse,
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
async function callLLM(params: LLMCallParams): Promise<string> {
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

  // Call OpenAI chat edge function with userId for tool execution
  const { getSupabase } = await import('../../lib/supabase');
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke('openai-chat', {
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
