/**
 * MODEL ROUTER
 * Cost-aware model selection
 */

export type ModelProvider = 'openai' | 'gemini';

// Emergency Gemini kill-switch
const GEMINI_AMA_ENABLED = import.meta.env.VITE_GEMINI_AMA !== 'false';

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
    costPer1kTokens: 0.00015, // pricing verified externally
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    estimatedTokensPerRequest: 500,
    costPer1kTokens: 0.0025, // pricing verified externally
  },
  'gemini-flash': {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    estimatedTokensPerRequest: 500,
    costPer1kTokens: 0.000075, // pricing verified externally
  },
  'gemini-pro': {
    provider: 'gemini',
    model: 'gemini-2.5-pro',
    estimatedTokensPerRequest: 500,
    costPer1kTokens: 0.00125, // pricing verified externally
  },
  'gemini-flash-lite': {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    estimatedTokensPerRequest: 300,
    costPer1kTokens: 0.00005, // pricing verified externally
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
  needsWeb?: boolean;        // ✅ ADD: Web research required
  wantsLinks?: boolean;      // ✅ ADD: User wants links/citations
  depth?: 'brief' | 'detailed'; // ✅ ADD: Response depth preference
  hints?: ModelSelectionHints; // ✅ ADD: Personality router hints
}

export type ModelSelectionHints = {
  use_gemini?: boolean;
  confidence?: number;
  reason?: string;
};

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
    needsWeb = false,        // ✅ ADD
    wantsLinks = false,      // ✅ ADD
    depth = 'brief',         // ✅ ADD
    hints,                    // ✅ ADD: Personality router hints
  } = context;

  // ✅ HIGH PRIORITY: web research always wins (before router hints)
  if (needsWeb) {
    const selection = {
      provider: 'gemini' as ModelProvider,
      model: depth === 'detailed' ? 'gemini-2.5-pro' : 'gemini-2.5-flash',
      tokensEst: 900,
      reason: 'web_research',
    };
    console.info('[modelRouter] Selected via needsWeb', selection);
    return selection;
  }

  // ✅ PRIORITY 2: Check personality router hints (only if not web research)
  if (hints?.use_gemini !== undefined) {
    const selection = {
      provider: hints.use_gemini ? 'gemini' : 'openai' as ModelProvider,
      model: hints.use_gemini ? 'gemini-2.5-flash' : 'gpt-4o-mini',
      tokensEst: 500,
      reason: hints.reason || 'personality_routing',
    };
    console.info('[modelRouter] Selected via router hints', selection);
    return selection;
  }

  // Conversational default for general chat (AMA) - with Gemini fallback
  if (intent === 'general') {
    const useGemini = GEMINI_AMA_ENABLED && hints?.use_gemini;
    const selection = {
      provider: useGemini ? 'gemini' : 'openai' as ModelProvider,
      model: useGemini ? 'gemini-2.5-flash' : 'gpt-4o-mini',
      tokensEst: messageLength + 300,
      temperature: 0.55,
      reason: useGemini ? 'ama_gemini_fallback' : 'ama_openai_fallback',
    };
    console.info('[modelRouter] Selected', { provider: selection.provider, model: selection.model, reason: selection.reason });
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
    console.info('[modelRouter] Selected', { provider: selection.provider, model: selection.model, reason: selection.reason });
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
    console.info('[modelRouter] Selected', { provider: selection.provider, model: selection.model, reason: selection.reason });
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
    console.info('[modelRouter] Selected', { provider: selection.provider, model: selection.model, reason: selection.reason });
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
    console.info('[modelRouter] Selected', { provider: selection.provider, model: selection.model, reason: selection.reason });
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
    console.info('[modelRouter] Selected', { provider: selection.provider, model: selection.model, reason: selection.reason });
    return selection;
  }

  // Default: use cheapest model for routine queries
  const selection = {
    provider: 'gemini' as ModelProvider,
    model: 'gemini-2.5-flash',
    tokensEst: messageLength + 300, // Estimate based on message length
    reason: 'default_cost_optimized',
  };
  console.info('[modelRouter] Selected', { provider: selection.provider, model: selection.model, reason: selection.reason });
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
