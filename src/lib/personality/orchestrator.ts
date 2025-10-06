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
import { callFoodMacros } from './tools';
import { resolveNutrition, parseNaturalQuantity, validateResolverConfig, type NutritionItem } from './nutritionResolver';
import { formatMacros } from './postAgents/macroFormatter';

// Guardrail constants
const MAX_TURN_MS = 5000; // Overall per-turn budget
const MAX_ROUTE_MS = 3500; // Max time for a delegated step
const MAX_CHAIN_DEPTH = 2; // Pat -> Role/Tool -> Back to Pat
const CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence for LLM router decisions

type RunInput = {
  userMessage: string;
  context: {
    userId: string;
    userProfile: UserProfile & { trial_ends?: string | null };
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
  agentConfig?: AgentConfig,
  draft?: string
): Promise<{ text: string; json?: any; error?: string }> {
  const agentsRec = getPersonalityAgents();
  const agent = agentConfig || agentsRec[agentId];
  if (!agent) return { text: "", error: `Agent ${agentId} not found` };

  const instructions = renderTemplate(agent.instructions, { context });
  
  // For post-agents, use draft; for pre-agents, use user_message
  const templateData = agent.phase === 'post' 
    ? { draft: draft || '', context, user_message: userMessage }
    : { user_message: userMessage, context };
  
  const prompt = renderTemplate(agent.promptTemplate, templateData);

  // Build proper system + user message structure
  const messages = [
    { role: "system", content: instructions },
    { role: "user", content: prompt }
  ];

  const chatOptions = {
    provider: agent.api.provider,
    model: agent.api.model,
    temperature: agent.api.temperature,
    max_output_tokens: agent.api.maxOutputTokens,
    response_format: agent.api.responseFormat,
    json_schema: agent.api.responseFormat === "json" ? agent.api.jsonSchema ?? null : null,
  };

  try {
    const res = await callChat(messages, chatOptions);

    if (res.ok) {
      // Handle response based on expected format
      if (agent.api.responseFormat === "json") {
        try {
          // Guard against empty responses
          if (!res.content || (typeof res.content === 'string' && res.content.trim() === '')) {
            console.warn(`[runAgent] Agent ${agentId} returned empty JSON response`);
            return { text: "", error: `Agent ${agentId} returned empty response` };
          }

          const parsed = typeof res.content === 'string' ? JSON.parse(res.content) : res.content;

          // Additional validation for known brittle agents
          if (agentId === 'intent-router' || agentId === 'tmwya-compliance-monitor') {
            if (!parsed || typeof parsed !== 'object') {
              console.warn(`[runAgent] Agent ${agentId} returned non-object JSON`);
              return { text: "", error: `Agent ${agentId} returned invalid JSON structure` };
            }
          }

          return { text: "", json: parsed };
        } catch (e: any) {
          console.warn(`[runAgent] Agent ${agentId} JSON parse error: ${e.message}`);
          return { text: "", error: `Agent ${agentId} returned invalid JSON: ${e.message}` };
        }
      } else {
        const text = res.content || "";
        return { text };
      }
    } else {
      return { text: "", error: res.error || `Agent ${agentId} call failed` };
    }
  } catch (e: any) {
    console.error(`[runAgent] Agent ${agentId} threw exception: ${e.message}`);
    return { text: "", error: e.message || `Agent ${agentId} threw exception` };
  }
}

// Role-specific logic handler
async function runRoleSpecificLogic(
  roleTarget: string,
  userMessage: string,
  context: Record<string, any>,
  routerParams: Record<string, any>
): Promise<{ finalAnswer: string | { text: string; meta?: any }; error?: string }> {
  if (roleTarget === "macro-question") {
    // Macro question (informational, not logging)
    console.info('[macro-route]', {
      route: 'macro-question',
      target: 'macro-question',
      confidence: 1.0
    });

    // Parse food items from user message - preserve quantities like "4 whole eggs", "2 slices sourdough"
    const foodMatch = userMessage.match(/(?:of|for|in)\s+(.+?)(?:\?|$)/i);
    let foodText = foodMatch ? foodMatch[1].trim() : userMessage;

    // Normalize '+' to 'and' for consistent splitting
    foodText = foodText.replace(/\s*\+\s*/g, ' and ');

    // Split on 'and' or comma, preserving quantities
    const split = foodText
      .split(/\s+(?:and|,)\s+/i)
      .map(s => s.trim())
      .filter(Boolean);

    const itemStrings = split.length ? split : [foodText.trim()];

    // Parse each item to extract quantity, unit, and name
    const parsedItems: NutritionItem[] = [];
    for (const itemStr of itemStrings) {
      // Try natural language parsing first
      const naturalParsed = parseNaturalQuantity(itemStr);

      if (naturalParsed.length > 0) {
        parsedItems.push(...naturalParsed);
      } else {
        // Fallback: treat as single item with count=1
        parsedItems.push({
          name: itemStr,
          qty: 1,
          unit: 'serving',
          basis: 'cooked',
        });
      }
    }

    // Log parsed items for telemetry
    console.info('[macro-telemetry:parsed-items]', {
      itemCount: parsedItems.length,
      items: parsedItems.map(i => ({ name: i.name, qty: i.qty, unit: i.unit })),
    });

    try {
      // Call the unified Nutrition Resolver
      const resolved = await resolveNutrition(parsedItems);

      // Log nutrition resolution telemetry
      console.info('[macro-resolver]', resolved.map(r => ({
        name: r.name,
        grams: r.grams_used,
        basis: r.basis_used,
        fiber: r.macros.fiber_g || 0
      })));

      if (resolved.length > 0) {
        // Build items array for meta payload
        const macroItems = resolved.map(r => ({
          name: r.name,
          qty: r.qty,
          unit: r.unit,
          grams_used: r.grams_used,
          basis_used: r.basis_used,
          kcal: r.macros.kcal,
          protein_g: r.macros.protein_g,
          carbs_g: r.macros.carbs_g,
          fat_g: r.macros.fat_g,
          fiber_g: r.macros.fiber_g || 0,
        }));

        // Calculate totals from items
        const totals = macroItems.reduce(
          (acc, it) => ({
            kcal: acc.kcal + it.kcal,
            protein_g: acc.protein_g + it.protein_g,
            carbs_g: acc.carbs_g + it.carbs_g,
            fat_g: acc.fat_g + it.fat_g,
            fiber_g: acc.fiber_g + (it.fiber_g || 0),
          }),
          { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
        );

        return {
          finalAnswer: {
            text: 'Here are the macros:',
            meta: {
              route: 'macro-question',
              macros: { items: macroItems, totals },
            },
          },
        };
      } else {
        return {
          finalAnswer: "I was unable to retrieve macro data for those items. Could you provide more specific food names?",
          error: "Nutrition resolution returned no items",
        };
      }
    } catch (error: any) {
      console.error('[macro-telemetry:error]', { error: error.message, items: parsedItems });
      return {
        finalAnswer: "I encountered an error while retrieving nutritional data. Please try again with more specific food names.",
        error: error.message,
      };
    }
  }

  if (roleTarget === "macro-logging") {
    // Macro logging handler - retrieves last unconsumed macro payload and logs it
    console.info('[macro-telemetry:route]', {
      route: 'macro-logging',
      target: 'macro-logging',
      timestamp: Date.now(),
    });

    const { getLastUnconsumedMacroPayload, parseLoggingCommand, checkCalorieBudget, saveMealFromMacros, markMacroPayloadConsumed } = await import('../meals/logMacroPayload');

    // Get session ID from context
    const sessionId = context.sessionId || context.activeChatId;
    if (!sessionId) {
      return {
        finalAnswer: "I need an active chat session to log meals. Please start a conversation first.",
        error: "No active session"
      };
    }

    // Retrieve last unconsumed macro payload
    const macroPayload = await getLastUnconsumedMacroPayload(sessionId, context.userId);

    if (!macroPayload) {
      return {
        finalAnswer: "I don't have a recent macro discussion to log. What did you eat?",
        error: "No unconsumed macro payload found"
      };
    }

    // Check if payload is too old (>48h)
    const payloadAge = Date.now() - new Date(macroPayload.created_at).getTime();
    if (payloadAge > 48 * 60 * 60 * 1000) {
      return {
        finalAnswer: "That macro discussion is outdated. Let me recalculate. What did you eat?",
        error: "Payload expired"
      };
    }

    // Parse the logging command
    const { action, items, adjustments } = parseLoggingCommand(userMessage, macroPayload);

    // Calculate total calories for this log
    const totalCalories = items.reduce((sum, item) => sum + (item.kcal || 0), 0);

    // Check calorie budget if CALORIE_WARNING_ENABLED
    const warningEnabled = import.meta.env.VITE_CALORIE_WARNING_ENABLED === 'true';
    if (warningEnabled) {
      const budget = await checkCalorieBudget(context.userId, totalCalories);
      if (budget.warn) {
        return {
          finalAnswer: `Logging this will put you approximately ${Math.round(budget.overage)} kcal over your daily target. Would you like to adjust portions or proceed? Say "proceed" to log anyway.`,
          error: "Calorie budget exceeded - awaiting confirmation"
        };
      }
    }

    // Parse time from user message (Phase 8)
    const { parseMealTime, formatMealTime } = await import('../meals/timeParser');
    const parsedTime = parseMealTime(userMessage, context.timezone);
    const mealTime = parsedTime.date;

    // Save the meal
    const saveResult = await saveMealFromMacros(context.userId, items, mealTime);

    if (!saveResult.success) {
      return {
        finalAnswer: "I encountered an error while logging your meal. Please try again.",
        error: saveResult.error
      };
    }

    // Mark payload as consumed
    await markMacroPayloadConsumed(macroPayload.message_id, context.userId);

    // Build confirmation message
    const itemNames = items.map(i => `${i.qty} ${i.unit} ${i.name}`).join(' and ');
    const timeStr = formatMealTime(parsedTime);

    let confirmation = adjustments
      ? `Adjusted: ${Object.entries(adjustments).map(([name, qty]) => `${name} → ${qty}`).join(', ')}. `
      : '';

    confirmation += `Logged. ${itemNames} ${timeStr}.`;

    return {
      finalAnswer: confirmation
    };
  }

  if (roleTarget === "tmwya") {
    // Tell Me What You Ate logic (actual logging)
    const foodName = routerParams.foodName || routerParams.food;
    if (!foodName || typeof foodName !== 'string') {
      return {
        finalAnswer: "I'd be delighted to assist you in logging your nutritional intake. Could you specify what you consumed?",
        error: "Missing foodName parameter"
      };
    }

    const macroResult = await callFoodMacros({ foodName });
    if (macroResult.ok && macroResult.json) {
      const macros = macroResult.json;
      return {
        finalAnswer: `I have successfully logged your consumption of ${foodName}. Per 100g, this provides approximately ${macros.kcal} calories, ${macros.protein_g}g protein, ${macros.carbs_g}g carbohydrates, and ${macros.fat_g}g fat. An excellent nutritional choice for your objectives.`,
      };
    } else {
      return {
        finalAnswer: `I have noted your consumption of ${foodName}. While I am unable to retrieve precise nutritional data at this moment, I acknowledge your commitment to tracking your intake. ${macroResult.text || ""}`,
        error: macroResult.text,
      };
    }
  }

  if (roleTarget === "workout") {
    // Future: workout tracking logic
    return {
      finalAnswer: "I am prepared to assist with your workout tracking. Please provide details regarding the exercises you completed.",
      error: "Workout tracking module not yet implemented"
    };
  }

  if (roleTarget === "mmb") {
    // Future: Make Me Better logic
    return {
      finalAnswer: "I value your feedback regarding my performance optimization. How may I enhance my assistance to better serve your objectives?",
      error: "Make Me Better module not yet implemented"
    };
  }

  return {
    finalAnswer: `I am currently unable to process requests for ${roleTarget}. This capability is under development.`,
    error: "Unknown role target"
  };
}

// Helper to run post-agents on a draft (with optional structured payload)
async function finishWithPostAgents(
  draft: string | { text: string; meta?: any },
  context: Record<string, any>,
  initialError?: string
): Promise<{ ok: boolean; answer: string; error?: string }> {
  // Normalize draft to object format
  let draftObj = typeof draft === 'string' ? { text: draft, meta: {} } : draft;
  let currentDraft = draftObj.text;

  const agentsRec = getPersonalityAgents();
  const orderedPostAgents = Object.values(agentsRec)
    .filter((a) => a.phase === "post" && a.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let formatterRan = false;

  // For macro responses, skip destructive post-agents AND actionizer (only run formatter)
  const isMacroResponse = draftObj.meta?.route === 'macro-question' || draftObj.meta?.route === 'macro-logging';
  const skipAgents = ['conciseness-filter', 'clarity-enforcer', 'evidence-validator', 'actionizer'];

  for (const agent of orderedPostAgents) {
    // Skip non-formatter agents for macro responses
    if (isMacroResponse && skipAgents.includes(agent.id)) {
      console.info(`[orchestrator] Skipping ${agent.id} for macro response`);
      continue;
    }

    // If already protected by formatter, skip all other agents
    if (draftObj.meta?.protected && agent.id !== 'macro-formatter') {
      console.info(`[orchestrator] Skipping ${agent.id} - draft is protected`);
      continue;
    }

    try {
      // DETERMINISTIC PATH: Call macro-formatter directly (no LLM)
      if (agent.id === 'macro-formatter') {
        const formatterResult = formatMacros({ text: currentDraft, meta: draftObj.meta });
        currentDraft = formatterResult.text;
        draftObj.meta = { ...draftObj.meta, ...formatterResult.meta };
        formatterRan = true;
        console.info('[macro-formatter]', {
          ran: true,
          hasFiber: (draftObj.meta?.macros?.totals?.fiber_g || 0) > 0
        });
      } else {
        // Standard LLM-based post-agents
        const result = await runAgent(agent.id, '', context, agent, currentDraft);

        if (result.error) {
          console.warn(`Post-agent ${agent.id} failed: ${result.error}`);
          // Continue with current draft if post-agent fails
        } else if (result.text) {
          currentDraft = result.text;
        }
      }
    } catch (e: any) {
      console.warn(`Post-agent ${agent.id} threw exception: ${e.message}`);
      // Continue with current draft
    }
  }

  // Log if macro formatter was expected but didn't run
  if (draftObj.meta?.route === 'macro-question' && !formatterRan) {
    console.warn('[macro-telemetry:formatter]', {
      formatter_ran: false,
      route: 'macro-question',
      reason: 'Formatter agent not found or disabled',
    });
  }

  return {
    ok: !initialError,
    answer: currentDraft,
    meta: draftObj.meta,
    error: initialError
  };
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
        return finishWithPostAgents(chatResult.content || "I am here to assist you with your objectives.", input.context);
      } else {
        return { ok: false, answer: "I am experiencing technical difficulties. Please attempt your request again momentarily.", error: chatResult.error, debug };
      }
    }

    // 1. Privacy & Redaction (always first)
    const redactionStart = Date.now();
    const redactedResult = await runAgent("privacy-redaction", currentMessage, input.context);
    debug.timings.redaction = Date.now() - redactionStart;
    
    if (redactedResult.error) {
      console.warn("Privacy redaction failed, proceeding with original message:", redactedResult.error);
    } else if (redactedResult.json?.sanitized) {
      currentMessage = redactedResult.json.sanitized;
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
      const permissionResult = checkPermissionsForTarget(input.context.userProfile, resolvedTarget);
      permissionGranted = permissionResult.allowed;
      debug.permission = {
        roleTarget: resolvedTarget,
        allowed: permissionGranted,
        reason: permissionResult.reason,
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
      return finishWithPostAgents("I require additional processing time for this request. Allow me to provide a streamlined response.", input.context, "Turn timeout");
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
      finalAnswer = `Direct tool invocation for ${decision.target} is not yet implemented.`;
      delegationError = "Direct tool calling not implemented";
    } else {
      // decision.route === "pat" or fallback
      debug.chosenPath = "pat_direct";
      const chatResult = await callChat([{ role: "user", content: currentMessage }]);
      if (chatResult.ok) {
        finalAnswer = chatResult.content || "I am here to assist you with your objectives.";
      } else {
        finalAnswer = "I am experiencing connectivity issues. Please retry your request.";
        delegationError = chatResult.error;
      }
    }

    debug.timings.delegation = Date.now() - delegationStart;

    // Check delegation timeout
    if (Date.now() - delegationStart > MAX_ROUTE_MS) {
      delegationError = "Delegated task exceeded time allocation";
      finalAnswer = `I was unable to complete that request within optimal parameters. ${finalAnswer}`;
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

    // CRITICAL: Even on fallback/error, run post-agents (especially Macro Formatter)
    const fallbackMessage = "I have encountered an unexpected system error. Please retry your request.";
    const fallbackResult = await finishWithPostAgents(fallbackMessage, input.context, e.message);

    return {
      ...fallbackResult,
      ok: false,
      error: e.message,
      debug
    };
  }
}