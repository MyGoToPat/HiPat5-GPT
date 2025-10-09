/**
 * Swarm Prompts & Rules - Single Source of Truth
 * All agent promptRef and rulesRef values resolve to these constants
 * LOCKED: Do not edit prompts in UI - changes must go through code review
 */

export const PROMPTS = {
  // ========================================================================
  // PERSONA SWARM - Tone, Polish, Safety (NO DOMAIN LOGIC)
  // ========================================================================

  PERSONA_MASTER: `You are Pat. Speak in first person. JARVIS-like: precise, calm, direct. Use short sentences, active voice. Never modify text inside [[PROTECT_BULLETS_START]]...[[PROTECT_BULLETS_END]]. Add evidence tags [RCT], [meta-analysis], [guideline], [textbook] only when making scientific claims outside bullet blocks. End with 'Next:' and 1–2 concrete actions unless the response is a verification view or single-word acknowledgment.`,

  PERSONA_EMPATHY: `Classify emotion. Output metadata only: {mood:'stressed|calm|neutral|angry|sad|excited', confidence:0..1}. Do not edit the draft text.`,

  PERSONA_AUDIENCE: `Infer expertise {audience:'novice|intermediate|advanced'} and attach to metadata. Do not change content.`,

  POST_EVIDENCE: `Ensure scientific claims have an evidence tag. Never edit protected macro blocks.`,

  POST_CLARITY: `Simplify long sentences (>20 words), define jargon inline. Do not edit protected macro blocks.`,

  POST_CONCISENESS: `Remove filler/banned words. Preserve all numbers, steps, and protected blocks.`,

  // ========================================================================
  // MACRO SWARM - Deterministic Q&A + Logging
  // ========================================================================

  SHARED_MACRO_NLU: `Return JSON only:
{ 'items':[{'name':'string','qty':number,'unit':'string|null','brand':'string|null','prep_method':'string|null','originalText':'string'}], 'meal_slot':'breakfast|lunch|dinner|snack|null' }
Rules: split compound items; accept fractions; preserve explicit oz/g; do NOT compute macros; no coaching.`,

  // ========================================================================
  // TMWYA SWARM - Full Meal Logging Pipeline
  // ========================================================================

  TMWYA_NORMALIZER: `Normalize dictation: expand shorthand, remove fillers, preserve numbers/units.`,

  // ========================================================================
  // MMB SWARM - Feedback/Bug Triage
  // ========================================================================

  MMB_TRIAGE: `Classify: BUG|FEATURE_REQUEST|UX_ISSUE|IMPROVEMENT|GENERAL. Ask at most 1 clarifying question only if crucial for reproduction.`,

} as const;

export const RULES = {
  // ========================================================================
  // PERSONA RULES
  // ========================================================================

  SAFETY_RULES: {
    bannedPatterns: [
      'stack clen + yohimbine + t3 without supervision',
      'inject household substances',
    ],
    action: 'block',
    responseFormat: { blocked: true, reason: 'string' }
  },

  ACTIONIZER_RULES: {
    requirement: `Append final line 'Next: ...' with 1–2 specific actions, unless response is a verification view.`,
    format: 'Next: [specific action 1]. [optional action 2].',
    skip: ['verification view', 'single-word acknowledgment']
  },

  MACRO_SENTINEL_RO: {
    mode: 'READ-ONLY',
    source: 'public.v_daily_macros',
    action: 'attach gentle nudges',
    restriction: 'No macro recomputation'
  },

  // ========================================================================
  // MACRO RULES
  // ========================================================================

  MACRO_ROUTER: {
    priority: [
      { pattern: /\b(log|log\s+it|log\s+all|log\s+that|save\s+it)\b/i, route: 'macro.logging', condition: 'unconsumed MacroPayload exists' },
      { pattern: /(macros? of|calories of|tell me.*macros)/i, route: 'macro.question' }
    ],
    default: 'macro.question'
  },

  RESOLVER_ADAPTER: `For each item, call Nutrition Resolver with basis='cooked' by default and Portion Resolver grams if needed. Brand/restaurant → per-item-as-served. Return ResolveResult where each item includes {kcal, protein_g, carbs_g, fat_g, fiber_g (0 if unknown), grams_used, basis}.`,

  MACRO_AGGREGATE: `Sum kcal, protein_g, carbs_g, fat_g, fiber_g.`,

  MACRO_FORMATTER_TEMPLATE: `Per item (inside protect markers):
[[PROTECT_BULLETS_START]]
{{qty}} {{unitOrBlank}} {{name}}
• Calories: {{round(kcal)}} kcal
• Protein: {{round1(protein_g)}} g
• Carbs: {{round1(carbs_g)}} g
• Fat: {{round1(fat_g)}} g
{{#if fiber_g>0}}• Fiber: {{round1(fiber_g)}} g{{/if}}
[[PROTECT_BULLETS_END]]

Totals (inside protect markers):
[[PROTECT_BULLETS_START]]
Total calories {{round(total.kcal)}}
{{#if total.fiber_g>0}}Total fiber {{round1(total.fiber_g)}} g{{/if}}
[[PROTECT_BULLETS_END]]

Then: Say "Log All" or "Log (food item)"`,

  MACRO_LOGGER_RULES: `Atomically consume the session's MacroPayload and write meals/items, including fiber_g, grams_used, basis. Mark payload consumed.`,

  PERSONA_GOVERNOR: `If protected macro bullets exist, do not alter their content. Persona polish allowed only outside.`,

  // ========================================================================
  // TMWYA RULES
  // ========================================================================

  TMWYA_INTENT: {
    classify: ['text', 'voice', 'barcode', 'photo'],
    requiresFollowup: ['photo', 'barcode']
  },

  PORTION_RESOLVER_RULES: `Defaults (basis=cooked unless 'raw' explicitly stated):
bacon.slice=10g; bread.slice=40g (sourdough 50g); egg.large=50g; cheese.slice=23g; rice.cup_cooked=158g; chicken.breast_default=170g cooked; steak.default=227g cooked (8oz). If user specifies oz/g, use exactly that. Brand/restaurant=per-item-as-served.`,

  NUTRITION_RESOLVER_RULES: `Single source of truth. Brand/restaurant → per-item 'as served'. Else per-100g for ingredient (selected basis), scaled by grams. Must return fiber_g (0 if unknown).`,

  TEF_RULES: {
    formula: {
      tef_protein: 'protein_g * 4 * 0.25',
      tef_carbs: 'carbs_g * 4 * 0.08',
      tef_fat: 'fat_g * 9 * 0.03'
    },
    net_kcal: 'total_kcal - (tef_protein + tef_carbs + tef_fat)'
  },

  TDEE_RULES: `Compare meal kcal vs daily target from user_metrics. Return remaining budget and on_track (±200 kcal).`,

  VERIFY_VIEW_TEMPLATE: `Deterministic confirmation view: item rows with bullets (including Fiber lines when >0), Total calories, Total fiber, TEF, Net, Remaining, and 'Confirm & Log' hint.`,

  TMWYA_LOGGER_RULES: `Write meals and meal_items with all fields including fiber_g, grams_used, basis. Trigger day_rollups update automatically.`,

  // ========================================================================
  // MMB RULES
  // ========================================================================

  MMB_ROUTER: {
    patterns: ['bug', 'issue', 'problem', 'suggestion', 'feature'],
    route: 'mmb'
  },

  MMB_TEMPLATE: `Format:
[Category]: BUG|FEATURE_REQUEST|UX_ISSUE|IMPROVEMENT|GENERAL
Status: LOGGED
Next: 1–2 actions for the user or internal ticket ref.`

} as const;

// Type exports for manifest loading
export type PromptRef = keyof typeof PROMPTS;
export type RulesRef = keyof typeof RULES;
