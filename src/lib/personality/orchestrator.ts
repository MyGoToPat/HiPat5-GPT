// UI-only; do not modify Edge Functions; no DB writes in this change.

import { AgentConfig } from "@/types/mcp";
import { renderTemplate } from "@/lib/personality/template";
import { getPersonalityAgents, getPersonalitySwarm, getRouterV1Enabled } from "@/state/personalityStore";
import { fastRoute, type RouteHit, resolveRoleTarget } from "./routingTable";
import { checkPermissionsForTarget, getPermissionDeniedMessage } from "./permissions";
import { invokeEdgeFunction, fetchFoodMacros } from "./tools";
import { callChat } from "@/lib/chat";
import { getSupabase } from "@/lib/supabase";
import type { UserProfile } from "@/types/user";

// Guardrail constants
const MAX_TURN_MS = 5000; // Overall per-turn budget
const MAX_ROUTE_MS = 3500; // Max time for a delegated step
const MAX_CHAIN_DEPTH = 2; // Pat -> Role/Tool -> Back to Pat
const CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence for LLM router decisions

type RunInput = {
  userMessage: string;
  context: {
    userId: string;
    userProfile: UserProfile;
    timezone?: string;
    freeMetrics?: Record<string, any>;
    [key: string]: any;
  };
};

// Router JSON validation
function validateRouterJson(json: any): RouteHit | null {
  if (!json || typeof json !== 'object') return null;
  
  const { route, confidence, target, params, reason } = json;
  
  // Required fields
  if (!route || typeof route !== 'string') return null;
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) return null;
  
  // Route must be valid enum value
  if (!['pat', 'role', 'tool', 'none'].includes(route)) return null;
  
  // If route is role or tool, target must be provided
  if ((route === 'role' || route === 'tool') && (!target || typeof target !== 'string')) return null;
  
  // Params must be object if present
  if (params !== undefined && (typeof params !== 'object' || Array.isArray(params))) return null;
  
  // Reason must be string if present
  if (reason !== undefined && typeof reason !== 'string') return null;
  
  return { route, target, confidence, params, reason } as RouteHit;
}

// Create 10-word summary for debug (PII-free)
function createSafeMessageSummary(message: string): string {
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2) // Remove short words
    .slice(0, 10);
  return words.join(' ') || 'empty message';
}

// Helper to run a single agent
async function runAgent(
  agentId: string,
  userMessage: string,
  context: Record<string, any>,
  agentConfig?: AgentConfig
): Promise<{ text: string; json?: any; error?: string }> {
  const agentsRec = getPersonalityAgents();
  const agent = agentConfig || agentsRec[agentId];
  if (!agent) return { text: "", error: `Agent ${agentId} not found` };

  const instructions = renderTemplate(agent.instructions, { context });
  const prompt = renderTemplate(agent.promptTemplate, { user_message: userMessage, context });

  const payload = {
    provider: agent.api.provider,
    model: agent.api.model,
    temperature: agent.api.temperature,
    max_output_tokens: agent.api.maxOutputTokens,
    response_format: agent.api.responseFormat,
    json_schema: agent.api.responseFormat === "json" ? agent.api.jsonSchema ?? null : null,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: prompt },
    ],
  };

  try {
    const res = await invokeEdgeFunction("openai-chat", payload);
    
    if (res.ok) {
      // Handle response based on expected format
      if (agent.api.responseFormat === "json") {
        try {
          const parsed = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
          return { text: "", json: parsed };
        } catch {
          return { text: "", error: `Agent ${agentId} returned invalid JSON` };
        }
      } else {
        const text = typeof res.result === 'string' ? res.result : JSON.stringify(res.result);
        return { text };
      }
    } else {
      return { text: "", error: res.error || `Agent ${agentId} call failed` };
    }
  } catch (e: any) {
    return { text: "", error: e.message || `Agent ${agentId} threw exception` };
  }
}

// Role-specific logic handler
async function runRoleSpecificLogic(
  roleTarget: string,
  userMessage: string,
  context: Record<string, any>,
  routerParams: Record<string, any>
): Promise<{ finalAnswer: string; error?: string }> {
  if (roleTarget === "tmwya") {
    // Tell Me What You Ate logic
    const foodName = routerParams.foodName || routerParams.food;
    if (!foodName || typeof foodName !== 'string') {
      return { 
        finalAnswer: "I'd love to help you log your meal! What did you eat?", 
        error: "Missing foodName parameter" 
      };
    }

    const macroResult = await fetchFoodMacros(foodName);
    if (macroResult.ok && macroResult.macros) {
      const macros = macroResult.macros;
      return {
        finalAnswer: `I've noted that you ate ${foodName}. Per 100g that's approximately ${macros.kcal || macros.calories} calories, ${macros.protein_g}g protein, ${macros.carbs_g}g carbs, and ${macros.fat_g}g fat. Great choice!`,
      };
    } else {
      return {
        finalAnswer: `I heard you ate ${foodName}! I couldn't get the exact nutrition details right now, but I'm glad you're tracking your intake. ${macroResult.error || ""}`,
        error: macroResult.error,
      };
    }
  }
  
  if (roleTarget === "workout") {
    // Future: workout tracking logic
    return {
      finalAnswer: "I'd love to help track your workout! Tell me about the exercises you did.",
      error: "Workout tracking not yet implemented"
    };
  }
  
  if (roleTarget === "mmb") {
    // Future: Make Me Better logic
    return {
      finalAnswer: "I appreciate your feedback! How can I improve to better help you?",
      error: "Make Me Better not yet implemented"
    };
  }

  return { 
    finalAnswer: `I'm not sure how to handle requests for ${roleTarget} yet.`, 
    error: "Unknown role target" 
  };
}

// Helper to run post-agents on a draft
async function finishWithPostAgents(
  draft: string,
  context: Record<string, any>,
  initialError?: string
): Promise<{ ok: boolean; answer: string; error?: string }> {
  let currentDraft = draft;
  const agentsRec = getPersonalityAgents();
  const orderedPostAgents = Object.values(agentsRec)
    .filter((a) => a.phase === "post" && a.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  for (const agent of orderedPostAgents) {
    try {
      // Pass draft via template context, not as user message
      const instructions = renderTemplate(agent.instructions, { context });
      const prompt = renderTemplate(agent.promptTemplate, { draft: currentDraft, context });
      
      const payload = {
        provider: agent.api.provider,
        model: agent.api.model,
        temperature: agent.api.temperature,
        max_output_tokens: agent.api.maxOutputTokens,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: prompt },
        ],
      };
      
      const res = await invokeEdgeFunction("openai-chat", payload);
      if (res.ok && res.result) {
        const text = typeof res.result === 'string' ? res.result : JSON.stringify(res.result);
        currentDraft = text;
      } else {
        console.warn(`Post-agent ${agent.id} failed: ${res.error}`);
        // Continue with current draft if post-agent fails
      }
    } catch (e: any) {
      console.warn(`Post-agent ${agent.id} threw exception: ${e.message}`);
      // Continue with current draft
    }
  }
  
  return { ok: !initialError, answer: currentDraft, error: initialError };
}

export async function runPersonalityPipeline(input: RunInput) {
  const startTime = Date.now();
  let currentMessage = input.userMessage;
  const debug: any = {
    messageSummary: createSafeMessageSummary(input.userMessage),
    fastRoute: null,
    routerDecision: null,
    permission: null,
    chosenPath: null,
    timings: {},
    triedTools: [],
    routeValidation: null
  };

  try {
    // Check feature flag first
    if (!getRouterV1Enabled()) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[orchestrator] Router V1 disabled, using fallback chat');
      }
      const chatResult = await callChat([{ role: "user", content: currentMessage }]);
      if (chatResult.ok) {
        return finishWithPostAgents(chatResult.content || "I'm here to help!", input.context);
      } else {
        return { ok: false, answer: "I'm having trouble right now. Please try again.", error: chatResult.error, debug };
      }
    }

    // 1. Privacy & Redaction (always first)
    const redactionStart = Date.now();
    const redactedResult = await runAgent("privacy-redaction", currentMessage, input.context);
    debug.timings.redaction = Date.now() - redactionStart;
    
    if (redactedResult.error) {
      console.warn("Privacy redaction failed, proceeding with original message:", redactedResult.error);
    } else if (redactedResult.text) {
      currentMessage = redactedResult.text;
    }

    // 2. Deterministic Routing (fastRoute)
    const fastRouteStart = Date.now();
    let decision: RouteHit = fastRoute(currentMessage);
    debug.fastRoute = decision;
    debug.timings.fastRoute = Date.now() - fastRouteStart;

    // 3. LLM-based Intent Router (if fastRoute is 'none')
    if (decision.route === "none") {
      const routerStart = Date.now();
      const routerResult = await runAgent("intent-router", currentMessage, input.context);
      debug.timings.intentRouter = Date.now() - routerStart;
      
      if (routerResult.error || !routerResult.json) {
        console.warn("Intent router LLM failed, defaulting to Pat:", routerResult.error);
        decision = { route: "pat", confidence: 0.0, reason: routerResult.error || "LLM router failed" };
        debug.routeValidation = "router_failed";
      } else {
        const validated = validateRouterJson(routerResult.json);
        if (!validated || validated.confidence < CONFIDENCE_THRESHOLD) {
          decision = { route: "pat", confidence: validated?.confidence || 0.0, reason: "Low confidence or invalid JSON" };
          debug.routeValidation = validated ? "low_confidence" : "invalid_json";
        } else {
          decision = validated;
          debug.routeValidation = "valid";
        }
      }
    }
    debug.routerDecision = decision;

    // 4. Permission Check (if delegating)
    let permissionGranted = true;
    if (decision.route !== "pat" && decision.target) {
      const resolvedTarget = resolveRoleTarget(decision.target);
      permissionGranted = checkPermissionsForTarget(input.context.userProfile, resolvedTarget);
      debug.permission = {
        roleTarget: resolvedTarget,
        allowed: permissionGranted,
        userRole: input.context.userProfile.role
      };
      
      if (!permissionGranted) {
        const deniedMessage = getPermissionDeniedMessage(resolvedTarget, input.context.userProfile.role || 'unknown');
        debug.chosenPath = "permission_denied";
        return finishWithPostAgents(deniedMessage, input.context, "Permission denied");
      }
    }

    // 5. Check overall turn budget
    if (Date.now() - startTime > MAX_TURN_MS) {
      debug.chosenPath = "turn_timeout";
      return finishWithPostAgents("I'm taking longer than expected. Let me give you a quick response instead.", input.context, "Turn timeout");
    }

    // 6. Delegation Logic
    let finalAnswer = "";
    let delegationError: string | undefined;
    const delegationStart = Date.now();

    if (decision.route === "role" && decision.target) {
      debug.chosenPath = `role:${decision.target}`;
      const roleResult = await runRoleSpecificLogic(
        resolveRoleTarget(decision.target), 
        currentMessage, 
        input.context, 
        decision.params || {}
      );
      finalAnswer = roleResult.finalAnswer;
      delegationError = roleResult.error;
      debug.triedTools.push(`role:${decision.target}`);
    } else if (decision.route === "tool" && decision.target) {
      debug.chosenPath = `tool:${decision.target}`;
      // Direct tool call (future: if router suggests calling tools directly)
      finalAnswer = `Tool calling not yet implemented for ${decision.target}`;
      delegationError = "Direct tool calling not implemented";
    } else {
      // decision.route === "pat" or fallback
      debug.chosenPath = "pat_direct";
      const chatResult = await callChat([{ role: "user", content: currentMessage }]);
      if (chatResult.ok) {
        finalAnswer = chatResult.content || "I'm here to help!";
      } else {
        finalAnswer = "I'm having trouble connecting right now. Please try again.";
        delegationError = chatResult.error;
      }
    }

    debug.timings.delegation = Date.now() - delegationStart;

    // Check delegation timeout
    if (Date.now() - delegationStart > MAX_ROUTE_MS) {
      delegationError = "Delegated task timed out";
      finalAnswer = `I couldn't complete that request quickly enough. ${finalAnswer}`;
    }

    // 7. Final Post-processing by Pat's agents
    const postStart = Date.now();
    const result = await finishWithPostAgents(finalAnswer, input.context, delegationError);
    debug.timings.postAgents = Date.now() - postStart;
    debug.timings.total = Date.now() - startTime;

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[orchestrator] Pipeline complete:', debug);
    }

    return { ...result, debug };

  } catch (e: any) {
    console.error("Persona Orchestrator critical error:", e);
    debug.timings.total = Date.now() - startTime;
    debug.error = e.message;
    return { 
      ok: false, 
      answer: "I encountered an unexpected error. Please try again.", 
      error: e.message, 
      debug 
    };
  }
}