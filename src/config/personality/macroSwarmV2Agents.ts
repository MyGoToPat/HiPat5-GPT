import type { AgentConfig } from '../../types/mcp';

/**
 * MACRO SWARM V2 - Clean 7-Agent System
 *
 * Replaces old macro system with deterministic, fiber-aware pipeline.
 * All agents visible in Admin → Agents under "Macro" role.
 *
 * Architecture:
 * - Pre-agents (1-4): Parse, resolve, aggregate (deterministic)
 * - Post-agent (5): Format output (deterministic)
 * - Action-agent (6): Log to database
 * - Governor (7): Apply tone (preserves bullets)
 */

// ============================================================================
// AGENT 1: macro.router - Deterministic Routing
// ============================================================================

export const macro_router: AgentConfig = {
  id: "macro.router",
  name: "Macro Router",
  phase: "pre",
  enabled: true,
  order: 0,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Routes macro requests to info (macro-question) or log (macro-logging) based on deterministic patterns.",
  promptTemplate: `N/A - This agent uses pure TypeScript routing (no LLM).

Implemented in: src/lib/personality/swarms/macroSwarmV2.ts

Patterns:
- Info: "macros of", "what are the macros", "calories of"
- Log: "log it", "log all", "log the X", "save it"

Output: { route: 'macro-question' | 'macro-logging', confidence: number }`,
  tone: { preset: "neutral", notes: "Deterministic routing" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.0,
    maxOutputTokens: 1,
    responseFormat: "text"
  }
};

// ============================================================================
// AGENT 2: macro.nlu - Natural Language Understanding
// ============================================================================

export const macro_nlu: AgentConfig = {
  id: "macro.nlu",
  name: "Meal NLU (Parser)",
  phase: "pre",
  enabled: true,
  order: 1,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Parses user text into separate food items with quantities. Supports fractions (1/2). Never merges unlike foods.",
  promptTemplate: `N/A - This agent uses pure TypeScript parsing (no LLM).

Implemented in: src/lib/personality/swarms/macroSwarmV2.ts

Examples:
- "1 cup oatmeal" → { name: "oatmeal", qty: 1, unit: "cup" }
- "1/2 cup blueberries" → { name: "blueberries", qty: 0.5, unit: "cup" }
- "3 large eggs" → { name: "eggs", qty: 3, unit: "large" }

Output Schema (Zod validated):
{
  items: [
    { name: string, qty: number, unit?: string, brand?: string }
  ]
}`,
  tone: { preset: "neutral", notes: "Deterministic parsing" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.0,
    maxOutputTokens: 1,
    responseFormat: "text"
  }
};

// ============================================================================
// AGENT 3: macro.resolverAdapter - Nutrition Resolver Adapter
// ============================================================================

export const macro_resolverAdapter: AgentConfig = {
  id: "macro.resolverAdapter",
  name: "Resolver Adapter",
  phase: "pre",
  enabled: true,
  order: 2,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Calls nutrition-resolver edge function. Returns macros with fiber_g for all items.",
  promptTemplate: `N/A - This agent calls Supabase edge function (no LLM).

Implemented in: src/lib/personality/swarms/macroSwarmV2.ts
Edge Function: supabase/functions/nutrition-resolver

Input: { items: [{ name, qty, unit, brand }] }

Output Schema (Zod validated):
{
  items: [
    {
      name: string,
      qty: number,
      unit: string,
      grams_used: number,
      basis_used: 'cooked' | 'raw' | 'as-served',
      macros: {
        kcal: number,
        protein_g: number,
        carbs_g: number,
        fat_g: number,
        fiber_g: number  // REQUIRED
      }
    }
  ]
}

Telemetry: [macro-resolver] with items array`,
  tone: { preset: "neutral", notes: "API adapter" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.0,
    maxOutputTokens: 1,
    responseFormat: "text"
  }
};

// ============================================================================
// AGENT 4: macro.aggregator - Macro Totals Aggregator
// ============================================================================

export const macro_aggregator: AgentConfig = {
  id: "macro.aggregator",
  name: "Macro Aggregator",
  phase: "pre",
  enabled: true,
  order: 3,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Pure TypeScript totals computation. Sums kcal, protein, carbs, fat, fiber across all items.",
  promptTemplate: `N/A - This agent uses pure TypeScript aggregation (no LLM).

Implemented in: src/lib/personality/swarms/macroSwarmV2.ts

Logic:
totals.kcal = sum(items.map(i => i.macros.kcal))
totals.protein_g = sum(items.map(i => i.macros.protein_g))
totals.carbs_g = sum(items.map(i => i.macros.carbs_g))
totals.fat_g = sum(items.map(i => i.macros.fat_g))
totals.fiber_g = sum(items.map(i => i.macros.fiber_g))

Output Schema (Zod validated):
{
  items: ResolvedItem[],
  totals: {
    kcal: number,
    protein_g: number,
    carbs_g: number,
    fat_g: number,
    fiber_g: number
  },
  consumed: false
}`,
  tone: { preset: "neutral", notes: "Pure computation" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.0,
    maxOutputTokens: 1,
    responseFormat: "text"
  }
};

// ============================================================================
// AGENT 5: macro.formatter.det - Deterministic Formatter
// ============================================================================

export const macro_formatter_det: AgentConfig = {
  id: "macro.formatter.det",
  name: "Deterministic Formatter",
  phase: "post",
  enabled: true,
  order: 100,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Deterministic text builder (no LLM). Outputs clean bullets with fiber, totals, and log hint. NO markers.",
  promptTemplate: `N/A - This agent uses pure TypeScript formatting (no LLM).

Implemented in: src/lib/personality/swarms/macroSwarmV2.ts

Output Format (EXACT):

<qty> <unit> <name>
• Calories: N kcal
• Protein: X g
• Carbs: Y g
• Fat: Z g
• Fiber: F g  ← only if F > 0

...repeat per item...

Total calories NNN
Total fiber M g

Say "Log All" or "Log (Food item)"

CRITICAL RULES:
1. NO [[PROTECT_BULLETS_START]] markers
2. NO coaching text ("Next: log your food...")
3. Show fiber per item only if > 0
4. ALWAYS show "Total fiber" line (even if 0g)
5. Round to 1 decimal, strip .0

Telemetry: [macro-formatter] with { ran: true, hasFiber: boolean }`,
  tone: { preset: "neutral", notes: "Pure formatting" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.0,
    maxOutputTokens: 1,
    responseFormat: "text"
  }
};

// ============================================================================
// AGENT 6: macro.logger - Macro Logger
// ============================================================================

export const macro_logger: AgentConfig = {
  id: "macro.logger",
  name: "Macro Logger",
  phase: "action",
  enabled: true,
  order: 200,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Writes meal_logs and meal_items with fiber. Finds last unconsumed payload. Supports quantity adjustments.",
  promptTemplate: `You are Pat's Macro Logger. Log meals from previous macro discussions.

USER COMMAND:
"{{user_message}}"

LAST UNCONSUMED MACRO PAYLOAD:
{{context.lastMacroPayload}}

TASK:
1. Parse logging command:
   - "log it" / "log all" → Log everything
   - "log the eggs" → Log only eggs
   - "log eggs with 4" → Scale eggs quantity and log

2. Quantity adjustments:
   - User can change quantities without re-resolving
   - Scale macros proportionally: new_kcal = old_kcal * (new_qty / old_qty)

3. Database writes:
   - Insert meal_logs (include micros_totals.fiber_g)
   - Insert meal_items (include micros.fiber_g per item)
   - Mark payload consumed: true

4. Confirmations:
   "Logged. {{itemCount}} item(s) - {{totalKcal}} kcal, {{totalFiber}}g fiber"

ERROR HANDLING:
- No payload: "I don't have a recent macro discussion to log. What did you eat?"
- Item not found: "Could not find '{{itemName}}' in the macro data."
- Payload consumed: "That macro data has already been logged. What did you eat?"

OUTPUT:
Brief confirmation with totals.`,
  tone: { preset: "helpful", notes: "Transactional" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxOutputTokens: 150,
    responseFormat: "text"
  }
};

// ============================================================================
// AGENT 7: persona.governor - Persona Governor
// ============================================================================

export const persona_governor: AgentConfig = {
  id: "persona.governor",
  name: "Persona Governor",
  phase: "post",
  enabled: true,
  order: 999,
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions: "Applies Pat's tone to text OUTSIDE macro bullet blocks. Must NOT edit formatted macro bullets.",
  promptTemplate: `You are Pat's Persona Governor. Apply Pat's communication style to the draft.

DRAFT RESPONSE:
"{{draft}}"

YOUR TASK:
IF draft contains macro bullets (starts with "• Calories:"):
  - Return draft UNCHANGED
  - Macro formatter output is protected

ELSE:
  - Apply Pat's tone: precise, expert, concise
  - Remove forbidden words (very, really, actually, basically, etc.)
  - Active voice only
  - Short sentences

OUTPUT:
The draft with Pat's tone applied (or unchanged if contains macros).`,
  tone: { preset: "scientist", notes: "JARVIS-like precision" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxOutputTokens: 500,
    responseFormat: "text"
  }
};

// ============================================================================
// EXPORT ALL MACRO SWARM V2 AGENTS
// ============================================================================

export const macroSwarmV2Agents: AgentConfig[] = [
  macro_router,
  macro_nlu,
  macro_resolverAdapter,
  macro_aggregator,
  macro_formatter_det,
  macro_logger,
  persona_governor
];
