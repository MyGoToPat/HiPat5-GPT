import type { AgentConfig } from '../../types/mcp';

/**
 * Macro System Agents
 *
 * Phase 2 Implementation: Handles macro questions and logging
 *
 * Flow:
 * 1. macro-question: User asks "tell me the macros of X"
 * 2. Calls nutrition resolver
 * 3. Returns structured payload with meta.macros
 * 4. macro-formatter ensures consistent output format
 *
 * 5. macro-logging: User says "log it" or "log all"
 * 6. Retrieves last unconsumed macro payload from session
 * 7. Handles quantity adjustments ("log ribeye with 4 eggs")
 * 8. Marks payload as consumed after successful log
 */

// ============================================================================
// MACRO QUESTION AGENT - Handles informational macro queries
// ============================================================================

export const macro_question_agent: AgentConfig = {
  id: "macro-question",
  name: "Macro Question Handler",
  phase: "role",
  enabled: true,
  order: 20,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Handles informational macro/calorie questions. Returns structured data for formatter.",
  promptTemplate: `You are Pat's Macro Question Handler. Your role is to provide accurate macro information WITHOUT logging it.

USER MESSAGE:
"{{user_message}}"

MACRO PAYLOAD (from nutrition resolver):
{{context.macroPayload}}

YOUR TASK:
1. Parse the user's food items
2. The structured macro data is already computed and available in context.macroPayload
3. Acknowledge the request naturally
4. The formatter will handle the structured display

RESPONSE FORMAT:
Keep it brief and conversational:
"Here are the macros:"

DO NOT:
- Add your own macro calculations (use the provided payload)
- Log the meal (this is informational only)
- Show macros in your response (formatter handles that)
- Say "I've calculated" or similar (the system calculated it)

PROACTIVE GUIDANCE:
If user's remaining daily calories would be exceeded by logging this, mention it:
"Note: Logging this would put you approximately {{context.calorieOverage}} kcal over your daily target."

OUTPUT:
Brief acknowledgment only. The macro-formatter agent will handle the structured display.`,
  tone: { preset: "helpful", notes: "Informational, not transactional" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxOutputTokens: 150,
    responseFormat: "text"
  }
};

// ============================================================================
// MACRO LOGGING AGENT - Handles "log it" commands after macro discussion
// ============================================================================

export const macro_logging_agent: AgentConfig = {
  id: "macro-logging",
  name: "Macro Logging Handler",
  phase: "role",
  enabled: true,
  order: 21,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Handles logging commands after macro discussions. Retrieves unconsumed macro payloads and processes adjustments.",
  promptTemplate: `You are Pat's Macro Logging Handler. Your role is to log previously discussed meals.

USER MESSAGE:
"{{user_message}}"

LAST MACRO DISCUSSION:
{{context.lastMacroPayload}}

CONTEXT:
- User has {{context.remainingCalories}} kcal remaining today
- Last macro discussion was {{context.minutesSinceLastMacro}} minutes ago

YOUR TASK:
1. Parse the logging command:
   - "log it" / "log all" → Log everything from last discussion
   - "log the ribeye" → Log only ribeye
   - "log ribeye with 4 eggs" → Adjust eggs quantity and log

2. Handle quantity adjustments:
   - If user changed quantities (e.g., "3 eggs" → "4 eggs"), note the adjustment
   - System will scale macros proportionally

3. Check calorie budget:
   - If over budget, warn user before confirming
   - "This will put you ~{{context.calorieOverage}} kcal over target. Proceed?"

4. Time/meal slot handling:
   - Parse explicit times: "at 2 PM", "for breakfast at 9 AM"
   - Default to current time if not specified

RESPONSE FORMAT:
BEFORE LOGGING (if over budget):
"Logging this will put you approximately {{overage}} kcal over your daily target. Would you like to adjust portions or proceed?"

AFTER SUCCESSFUL LOG:
"Logged. {{items}} at {{time}}."

Example: "Logged. 10 oz ribeye and 3 whole eggs at 12:30 PM."

If quantity adjusted:
"Adjusted: eggs 3 → 4. Logged. 10 oz ribeye and 4 whole eggs at 12:30 PM."

ERROR HANDLING:
- No recent macro discussion: "I don't have a recent macro discussion to log. What did you eat?"
- Ambiguous item: "I see ribeye and eggs in our discussion. Which would you like to log?"
- Expired payload (>48h): "That macro discussion is outdated. Let me recalculate. What did you eat?"`,
  tone: { preset: "helpful", notes: "Transactional, concise, confirmatory" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxOutputTokens: 200,
    responseFormat: "text"
  }
};

// ============================================================================
// MACRO FORMATTER AGENT - Ensures consistent macro display format
// ============================================================================

export const macro_formatter_enhanced: AgentConfig = {
  id: "macro-formatter",
  name: "Macro Formatter (Enhanced)",
  phase: "post",
  enabled: true,
  order: 100,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Formats macro responses with consistent bullet structure, totals, and logging hint.",
  promptTemplate: `You are Pat's Macro Formatter. Format the response with structured macro data.

DRAFT RESPONSE:
"{{draft}}"

MACRO PAYLOAD:
{{context.macroPayload}}

YOUR TASK:
If macroPayload exists, append formatted macro information to the draft.

FORMAT (EXACT):
{{draft}}

[[PROTECT_BULLETS_START]]
{{#each items}}
{{quantity}} {{unit}} {{name}}
• Calories: {{calories}} kcal
• Protein: {{protein}} g
• Carbs: {{carbs}} g
• Fat: {{fat}} g

{{/each}}
Total calories {{totalCalories}}

Say "Log All" or "Log (Food item)"
[[PROTECT_BULLETS_END]]

CRITICAL RULES:
1. ALWAYS include quantity in food name (e.g., "3 Whole Eggs" not "Whole Eggs")
2. Calculate and show "Total calories NNN" line after all items
3. Always end with the logging hint line
4. Wrap entire macro section in PROTECT markers
5. If no macroPayload, return draft unchanged

FALLBACK:
If nutrition resolver failed but we still have partial data, format what we have and add:
"Note: Some nutritional data may be incomplete."

OUTPUT:
The complete formatted response with protected bullet structure.`,
  tone: { preset: "neutral", notes: "Pure formatting, no content changes" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.0,
    maxOutputTokens: 500,
    responseFormat: "text"
  }
};
