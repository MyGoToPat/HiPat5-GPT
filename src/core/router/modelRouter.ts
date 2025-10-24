/**
 * MODEL ROUTER
 * Cost-aware model selection
 */

export type ModelProvider = 'openai' | 'gemini';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  estimatedTokensPerRequest: number;
  costPer1kTokens: number;
}

export interface ModelSelection {
  provider: ModelProvider;
  model: string;
  tokensEst: number;
  temperature?: number;
  latencyMs?: number;
  reason: string;
}

const MODELS: Record<string, ModelConfig> = {
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    estimatedTokensPerRequest: 500,
    costPer1kTokens: 0.00015, // $0.15 per 1M input tokens
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    estimatedTokensPerRequest: 500,
    costPer1kTokens: 0.0025, // $2.50 per 1M input tokens
  },
  'gemini-flash': {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    estimatedTokensPerRequest: 500,
    costPer1kTokens: 0.000075, // $0.075 per 1M input tokens (cheaper!)
  },
  'gemini-pro': {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    estimatedTokensPerRequest: 500,
    costPer1kTokens: 0.00125, // $1.25 per 1M input tokens
  },
} as const;

export interface ModelRouterContext {
  intent?: string;
  intentConfidence: number;
  messageLength: number;
  requiresStructuredOutput?: boolean;
  userRequestedExpert?: boolean;
  previousFailures?: number;
  forceOpenAI?: boolean;
}

/**
 * Select the most appropriate model based on context
 */
export function selectModel(context: ModelRouterContext): ModelSelection {
  const {
    intent,
    intentConfidence,
    messageLength,
    requiresStructuredOutput = false,
    userRequestedExpert = false,
    previousFailures = 0,
    forceOpenAI = false,
  } = context;

  // Conversational default for general chat (higher temperature for natural flow)
  if (intent === 'general') {
    const selection = {
      provider: 'openai' as ModelProvider,
      model: 'gpt-4o-mini',
      tokensEst: messageLength + 300,
      temperature: 0.55,
      reason: 'conversational_default',
    };
    console.log('[modelRouter] Selected:', JSON.stringify(selection));
    return selection;
  }

  // Force OpenAI for greetings and personality-driven interactions
  if (forceOpenAI) {
    const selection = {
      provider: 'openai' as ModelProvider,
      model: 'gpt-4o-mini',
      tokensEst: 400,
      temperature: 0.55,
      reason: 'personality_interaction',
    };
    console.log('[modelRouter] Selected:', JSON.stringify(selection));
    return selection;
  }

  // Escalate if user explicitly requests expert mode
  if (userRequestedExpert) {
    const selection = {
      provider: 'openai' as ModelProvider,
      model: 'gpt-4o',
      tokensEst: 1000,
      reason: 'user_requested_expert',
    };
    console.log('[modelRouter] Selected:', JSON.stringify(selection));
    return selection;
  }

  // Escalate if previous attempts failed
  if (previousFailures > 0) {
    const selection = {
      provider: 'openai' as ModelProvider,
      model: 'gpt-4o',
      tokensEst: 1000,
      reason: 'retry_with_stronger_model',
    };
    console.log('[modelRouter] Selected:', JSON.stringify(selection));
    return selection;
  }

  // Escalate if intent confidence is low (ambiguous request)
  if (intentConfidence < 0.6) {
    const selection = {
      provider: 'openai' as ModelProvider,
      model: 'gpt-4o-mini',
      tokensEst: 600,
      reason: 'low_confidence_needs_better_understanding',
    };
    console.log('[modelRouter] Selected:', JSON.stringify(selection));
    return selection;
  }

  // For structured output (JSON), prefer OpenAI for reliability
  if (requiresStructuredOutput) {
    const selection = {
      provider: 'openai' as ModelProvider,
      model: 'gpt-4o-mini',
      tokensEst: 500,
      reason: 'structured_output_required',
    };
    console.log('[modelRouter] Selected:', JSON.stringify(selection));
    return selection;
  }

  // Default: use cheapest model for routine queries
  const selection = {
    provider: 'gemini' as ModelProvider,
    model: 'gemini-1.5-flash',
    tokensEst: messageLength + 300, // Estimate based on message length
    reason: 'default_cost_optimized',
  };
  console.log('[modelRouter] Selected:', JSON.stringify(selection));
  return selection;
}

/**
 * Calculate estimated cost for a model call
 */
export function estimateCost(selection: ModelSelection): number {
  const config = MODELS[selection.model as keyof typeof MODELS];
  if (!config) return 0.02; // Default fallback cost

  const tokens = selection.tokensEst || config.estimatedTokensPerRequest;
  return (tokens / 1000) * config.costPer1kTokens;
}

/**
 * Get model display name for logging
 */
export function getModelDisplayName(selection: ModelSelection): string {
  return `${selection.provider}:${selection.model}`;
}
