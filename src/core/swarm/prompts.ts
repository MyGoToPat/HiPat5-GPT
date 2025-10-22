/**
 * SWARM PROMPT LIBRARY V3
 * Central repository for all agent prompts
 *
 * ARCHITECTURE:
 * - PERSONA_MASTER: Imports from patSystem.ts (single source of truth)
 * - Quality gates: Lightweight, focused agents
 * - Domain-agnostic: No fitness/nutrition bias
 *
 * Each prompt can be:
 * 1. Edited directly here (requires code deploy)
 * 2. Overridden in database (agent_configs table)
 * 3. Edited via admin UI (future Phase 2)
 */

import { PAT_SYSTEM_PROMPT } from '../personality/patSystem';

export const PROMPT_LIBRARY: Record<string, string> = {
  // ========================================================================
  // PERSONA SWARM - Pat's Core Personality (Domain-Agnostic)
  // ========================================================================

  PERSONA_MASTER: PAT_SYSTEM_PROMPT,

  PERSONA_EMPATHY: `Task: Detect emotional state and provide style guidance.

Analyze the user's message for emotional cues. Output JSON ONLY (no text).

{
  "mood": "stressed|calm|neutral|excited|frustrated|motivated|confused|sad|angry|tired|in_pain",
  "valence": "negative|neutral|positive",
  "arousal": "low|medium|high",
  "confidence": 0.0-1.0,
  "indicators": ["brief cues you detected"],
  "style_hint": {
    "pace": "slower|steady|faster",
    "directness": "soft|neutral|blunt",
    "encouragement": "low|medium|high"
  }
}

Rules:
- Do NOT edit user text
- Do NOT provide advice
- Analysis only
- If neutral/unclear, use neutral defaults`,

  PERSONA_AUDIENCE: `Task: Detect expertise level and format preferences.

Analyze the user's message for knowledge indicators. Output JSON ONLY (no text).

{
  "audience": "novice|intermediate|advanced|expert",
  "confidence": 0.0-1.0,
  "indicators": ["brief reasoning"],
  "verbosity": "brief|standard|detailed|technical",
  "format_pref": "bullets|paragraph|steps|code",
  "jargon_policy": "avoid|light|match_user|use",
  "math_detail": "low|medium|high"
}

Rules:
- Do NOT edit content
- Do NOT provide guidance
- Detection only
- Default to "intermediate" if unclear`,

  POST_CLARITY: `Task: Polish for clarity while preserving meaning and protected blocks.

Rules:
- Use natural, conversational sentence lengths (no arbitrary word limits)
- Define technical terms on first use: "term (short definition)"
- Use parallel structure in lists
- Keep persona tone from PAT_SYSTEM_PROMPT
- NEVER modify text inside [[PROTECT_*_START]] and [[PROTECT_*_END]] markers

If already clear, return unchanged.

Draft:
"""{{draft}}"""`,

  PROTECTED_BLOCKS_SENTINEL: `Task: Validate protected blocks remain unchanged.

Check that ALL text between [[PROTECT_*_START]] and [[PROTECT_*_END]] markers is identical to original.

Protected sections include:
- Numbers, units, calculations
- Formatted data (bullets, tables)
- Code blocks
- Domain-specific outputs

If ANY protected content changed, output:
{
  "valid": false,
  "violations": ["description of changes"]
}

If valid, output:
{
  "valid": true
}

This is a CRITICAL safety check. Protected blocks must remain byte-for-byte identical.`,

  // ========================================================================
  // REMOVED AGENTS (Now handled by PERSONA_MASTER or consolidated):
  // - POST_EVIDENCE (built into PAT_SYSTEM_PROMPT)
  // - POST_CONCISENESS (built into PAT_SYSTEM_PROMPT)
  // - ACTIONIZER (built into PAT_SYSTEM_PROMPT)
  // ========================================================================

  // ========================================================================
  // MACRO SWARM - Nutrition Q&A (Domain-Specific, Not Personality)
  // ========================================================================

  MACRO_NLU: `Extract structured food data from natural language.

Output JSON only:
{
  "items": [
    {
      "name": "food name",
      "qty": number,
      "unit": "string or null",
      "brand": "string or null",
      "prep_method": "string or null",
      "originalText": "exact user text"
    }
  ],
  "meal_slot": "breakfast|lunch|dinner|snack|null"
}

Rules:
- Split compound items ("eggs and toast" → 2 items)
- Accept fractions ("1/2 cup" → 0.5)
- Preserve units exactly as stated
- Do NOT calculate macros
- Do NOT provide nutrition advice`,

  MACRO_FORMATTER: `Format nutrition data in a clean, scannable format.

Template:
**{{food_name}}** ({{qty}} {{unit}})
• Calories: {{kcal}} kcal
• Protein: {{protein_g}} g
• Carbs: {{carbs_g}} g
• Fat: {{fat_g}} g
{{#if fiber_g > 0}}• Fiber: {{fiber_g}} g{{/if}}

Keep formatting consistent and easy to read.`,

  // ========================================================================
  // TMWYA SWARM - Tell Me What You Ate (Meal Logging)
  // ========================================================================

  TMWYA_NORMALIZER: `Normalize voice/text input for meal logging.

Corrections:
- Expand shorthand ("oz" → "ounces")
- Remove filler words ("um", "like", "you know")
- Fix common dictation errors ("to eggs" → "2 eggs")
- Preserve all numbers and units exactly

Output the normalized text only.`,

  TMWYA_INTENT: `Determine if the user wants to log food or just ask about it.

Output JSON:
{
  "intent": "log|question|unclear",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Hints:
- "I ate", "I had", "for breakfast" → log
- "what are the macros", "how many calories" → question
- "log it", "save that" → log (requires previous context)`,

  // ========================================================================
  // MMB SWARM - Make Me Better (Feedback/Bugs)
  // ========================================================================

  MMB_TRIAGE: `Classify user feedback.

Output JSON:
{
  "category": "bug|feature_request|ux_issue|improvement|question",
  "severity": "critical|high|medium|low",
  "summary": "one-line description",
  "needsClarification": boolean,
  "clarifyingQuestion": "string or null"
}

Ask at most 1 clarifying question if critical details are missing.`,

} as const;

/**
 * Resolve a prompt reference to actual prompt text
 * PRIORITY: Database > Hardcoded library
 */
export async function resolvePromptRef(promptRef: string): Promise<string | null> {
  // Try loading from database first
  try {
    const { getSupabase } = await import('../../lib/supabase');
    const supabase = getSupabase();

    const { data: dbPrompt, error } = await supabase
      .from('agent_prompts')
      .select('content')
      .eq('agent_id', promptRef)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbPrompt?.content) {
      console.log(`[prompts] ✓ Loaded ${promptRef} from database`);
      return dbPrompt.content;
    }

    if (error) {
      console.warn(`[prompts] Database lookup failed for ${promptRef}:`, error.message);
    }
  } catch (err) {
    console.warn(`[prompts] Failed to load ${promptRef} from database:`, err);
  }

  // Fallback to hardcoded library
  const prompt = PROMPT_LIBRARY[promptRef];

  if (!prompt) {
    console.warn(`[prompts] Unknown prompt reference: ${promptRef}`);
    return null;
  }

  console.log(`[prompts] ⚠ Using fallback hardcoded prompt for ${promptRef}`);
  return prompt;
}

/**
 * Get all available prompt refs (for admin UI)
 */
export function getAvailablePrompts(): string[] {
  return Object.keys(PROMPT_LIBRARY);
}
