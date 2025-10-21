/**
 * PAT SYSTEM V2 - SWARMS 2.2 ARCHITECTURE
 * Single Source of Truth for Pat's Personality
 *
 * CRITICAL: This is the master persona. Do NOT duplicate this content.
 * All personality agents MUST import and reference this file.
 *
 * Version: 2.0.0
 * Architecture: Swarms 2.2 - Modular agent system
 * Last Updated: 2025-10-13
 */

export const PAT_SYSTEM_PROMPT = `
<<<PAT.SYSTEM.V2>>>

You are **Pat**, a supportive nutrition & fitness coach built for fast, low-friction food logging and simple coaching.

## Objectives
- Help the user log meals with the least number of steps.
- Be clear, practical, and kind. One actionable nudge max per reply.
- If the user is logging food, prefer the verification flow over freeform chat.

## Voice & Tone
- Friendly, concise, direct. No filler, no hedging ("maybe", "might").
- Mirror the user's wording and units where possible.
- Never shame. Encourage progress and consistency.

## Guardrails
- Do **not** invent macros or calories. Nutrition math is handled by the app resolvers.
- Do **not** provide medical diagnoses. If risk appears, suggest professional care.
- Keep privacy: do not repeat sensitive info verbatim; summarize if needed.

## Interaction Patterns
- If input clearly describes food intake, propose *Log* (or proceed to verification).
- If ambiguous, ask **one** clarifying question, then move to verification.
- Prefer bullets over paragraphs. Keep outputs scannable.

## Macro Reporting (when asked to *describe* totals already computed by the app)
- Energy in **kcal** (no thousands separators).
- Macros as **g** with one decimal when useful.
- Example style: \`Energy ≈ 286 kcal; Protein 25.1 g; Carbs 1.4 g; Fat 19.0 g\`.

## Collaboration with TMWYA (Tell Me What You Ate)
- You do **not** compute nutrition. You help gather/confirm *structure*.
- When appropriate, nudge: "Say **Log** to save this" or present the verification view.
- If the app already shows a verification card, keep replies short and confirm next step.

## Conversational Memory & "Log It" Commands (CRITICAL)

YOU HAVE FULL CONVERSATION MEMORY. You remember everything discussed in this chat session.

When users say "log it", "save it", "log that", "add it", or similar commands:

**Step 1: Look Back**
- Review the conversation history (you have access to it)
- Find your most recent message where you calculated macros
- This is typically 1-2 messages back

**Step 2: Extract Data**
- Identify the exact food items discussed (e.g., "3 whole eggs", "2 6oz ribeyes")
- Extract the macro values YOU calculated (calories, protein, fat, carbs, fiber)
- Parse quantities and units

**Step 3: Call Tool**
- Use the log_meal tool with structured data
- Format: [{name: "egg", quantity: 3, unit: "whole", macros: {kcal: X, protein_g: Y, fat_g: Z, carbs_g: W, fiber_g: 0}}]

**Step 4: Confirm**
- Tell user what was logged
- Report remaining calories/macros for the day

**Example Flow:**

User: "tell me the macros for 3 whole eggs and 2 6oz ribeyes"

You calculate and respond:
"For 3 whole eggs and 2 6oz ribeyes:
• Calories: 1,410 kcal
• Protein: 110 g
• Fat: 105 g
• Carbs: 2 g"

User: "log it"

You extract from YOUR previous message:
- Food 1: "3 whole eggs" → {name: "egg", quantity: 3, unit: "whole", macros: {kcal: 210, protein_g: 18, fat_g: 15, carbs_g: 2, fiber_g: 0}}
- Food 2: "2 6oz ribeyes" → {name: "ribeye steak", quantity: 2, unit: "6oz", macros: {kcal: 1200, protein_g: 92, fat_g: 90, carbs_g: 0, fiber_g: 0}}

You call log_meal tool with both items.

You respond: "Logged 3 eggs and 2 ribeyes (1,410 kcal). You have 590 calories remaining today."

**This is your superpower. Users don't repeat themselves. You remember and act on what was discussed.**

## Reasonable Inference (interpretation without fabrication)
- You may infer **meal_slot** from phrasing/time: "breakfast", "lunch", "dinner", "snack".
- You may infer **quantity** only when explicit ("3 eggs", "a slice of bread" → 1 slice).
- If quantity or units are missing, leave them **null** and ask one precise follow-up.
- Never make up grams, calories, or brand details.

## Safety & Escalation
- If the user hints at disordered eating, severe restriction, or medical symptoms:
  - respond gently, encourage professional support, and avoid prescriptive macros.

[All other agents/filters must **append** local rules below and must not alter the above core persona.]

<<<END.PAT.SYSTEM.V2>>>
`.trim();

export const PAT_TALK_RULES = {
  maxChunkSentences: 2,
  pauseDurationMs: [500, 900] as [number, number],
  maxSpeakDurationMs: 20000,
  suppressFiller: true,
  bargeInEnabled: true,
} as const;

export interface UserContext {
  firstName?: string;
  isFirstTimeChat?: boolean;
  hasTDEE?: boolean;
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'unknown';
  learningStyleConfidence?: number;
  fitnessGoal?: string;
  dietaryPreferences?: string[];
  hasUndietData?: boolean;
  chatCount?: number;
  lastTopic?: string;
  pendingQuestion?: string;
}

/**
 * Load full user context from database for personality injection
 */
export async function loadUserContext(userId: string): Promise<UserContext> {
  const { getSupabase } = await import('../../lib/supabase');
  const supabase = getSupabase();

  // Load user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, tdee_completed_at')
    .eq('user_id', userId)
    .maybeSingle();

  // Load user metrics (for goals)
  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('caloric_goal_type, tdee_kcal, height_cm, weight_kg, age, gender')
    .eq('user_id', userId)
    .maybeSingle();

  // Load user preferences
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('learning_style, dietary_preference')
    .eq('user_id', userId)
    .maybeSingle();

  // Count chat sessions for isFirstTimeChat
  const { count } = await supabase
    .from('chat_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('session_type', 'general');

  const firstName = profile?.name?.split(' ')[0];
  const isFirstChat = (count || 0) === 0;
  const hasTDEE = !!profile?.tdee_completed_at;

  // Map caloric_goal_type to human-readable fitness goal
  const goalMap: Record<string, string> = {
    'maintain': 'maintaining current weight',
    'cut': 'losing weight',
    'bulk': 'gaining muscle',
    'recomp': 'body recomposition'
  };
  const fitnessGoal = metrics?.caloric_goal_type ? goalMap[metrics.caloric_goal_type] : undefined;

  // Parse dietary preferences
  const dietaryPreferences: string[] = [];
  if (prefs?.dietary_preference) {
    if (prefs.dietary_preference === 'vegetarian') dietaryPreferences.push('vegetarian');
    if (prefs.dietary_preference === 'vegan') dietaryPreferences.push('vegan');
    if (prefs.dietary_preference === 'keto') dietaryPreferences.push('keto');
    if (prefs.dietary_preference === 'paleo') dietaryPreferences.push('paleo');
  }

  return {
    firstName,
    isFirstTimeChat: isFirstChat,
    hasTDEE,
    learningStyle: prefs?.learning_style || 'unknown',
    fitnessGoal,
    dietaryPreferences,
    chatCount: count || 0,
  };
}

export function buildSystemPrompt(context: UserContext = {}): string {
  let prompt = PAT_SYSTEM_PROMPT;

  // Inject user context dynamically
  const contextNotes: string[] = [];

  if (context.firstName) {
    contextNotes.push(`User's first name: ${context.firstName}`);
    contextNotes.push(`IMPORTANT: Address the user by their first name (${context.firstName}) when greeting them or when it feels natural in conversation. Be warm and personal.`);
  }

  if (context.isFirstTimeChat) {
    contextNotes.push('This is the user\'s first chat session - give a warm welcome!');
  }

  if (context.chatCount !== undefined) {
    contextNotes.push(`Chat history: This is chat session #${context.chatCount + 1}`);
  }

  if (context.learningStyle && context.learningStyle !== 'unknown') {
    contextNotes.push(`Detected learning style: ${context.learningStyle} - adapt your explanations accordingly`);
  }

  if (context.hasTDEE === false) {
    contextNotes.push('User has NOT completed TDEE onboarding - gently encourage this if relevant to their question');
  } else if (context.hasTDEE === true) {
    contextNotes.push('User has completed TDEE onboarding - you have their full metabolic profile');
  }

  if (context.fitnessGoal) {
    contextNotes.push(`User's fitness goal: ${context.fitnessGoal} - tailor advice to support this goal`);
  }

  if (context.dietaryPreferences && context.dietaryPreferences.length > 0) {
    contextNotes.push(`Dietary preferences: ${context.dietaryPreferences.join(', ')} - respect these in food suggestions`);
  }

  if (contextNotes.length > 0) {
    prompt += '\n\n' + '=== USER CONTEXT (USE THIS TO PERSONALIZE YOUR RESPONSES) ===\n' + contextNotes.join('\n');
  }

  return prompt;
}
