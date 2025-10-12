/**
 * MAIN USER MESSAGE HANDLER
 * Coordinates intent detection, model selection, role execution, and LLM response
 */

import { detectIntent, shouldTriggerRole } from '../router/intentRouter';
import { selectModel, estimateCost, getModelDisplayName, type ModelSelection } from '../router/modelRouter';
import { buildSystemPrompt, type UserContext } from '../personality/patSystem';
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

  // Load recent message history if not provided
  const messageHistory = context.messageHistory || await loadRecentMessages(sessionId, 10);

  // Step 1: Store user message
  await storeMessage(sessionId, 'user', message);

  // Step 2: Detect intent
  const intentResult = await detectIntent(message);
  console.log('[handleUserMessage] Intent detected:', intentResult);

  // Step 3: Select model
  const modelSelection: ModelSelection = selectModel({
    intentConfidence: intentResult.confidence,
    messageLength: message.length,
    requiresStructuredOutput: shouldTriggerRole(intentResult.intent),
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
  const systemPrompt = buildSystemPrompt(context.userContext || {});

  // Step 6: Call LLM (placeholder - will be implemented with actual API calls)
  const llmResponse = await callLLM({
    system: systemPrompt,
    userMessage: message,
    messageHistory,
    roleData,
    modelSelection,
  });

  // Step 7: Store assistant response
  await storeMessage(sessionId, 'assistant', llmResponse);

  return {
    response: llmResponse,
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    modelUsed: getModelDisplayName(modelSelection),
    estimatedCost: cost,
    roleData,
  };
}

interface LLMCallParams {
  system: string;
  userMessage: string;
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  roleData: any;
  modelSelection: ModelSelection;
}

/**
 * Call LLM with prepared context
 * TODO: Implement actual OpenAI/Gemini API calls
 */
async function callLLM(params: LLMCallParams): Promise<string> {
  const { system, userMessage, messageHistory, roleData, modelSelection } = params;

  // Placeholder implementation
  console.log('[callLLM] Calling', getModelDisplayName(modelSelection));
  console.log('[callLLM] System prompt length:', system.length);
  console.log('[callLLM] Message history:', messageHistory.length, 'messages');
  console.log('[callLLM] Role data:', roleData ? 'present' : 'none');

  // TODO: Replace with actual API call to OpenAI or Gemini
  // For now, return a placeholder response

  if (roleData) {
    return `I've processed your request and here's what I found:\n\n${JSON.stringify(roleData, null, 2)}\n\nLet me know if you need anything else!`;
  }

  return `I understand you're asking: "${userMessage}"\n\nI'm here to help with fitness and nutrition questions. This is a placeholder response - the full LLM integration is coming next.\n\nNext: Ask me about macros, workouts, or your daily progress!`;
}
