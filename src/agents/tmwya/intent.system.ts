/**
 * TMWYA Intent Detection System Prompt
 * Determines if user message contains food intake suitable for logging
 *
 * Used by: TMWYA pipeline (intent classification stage)
 * Returns: Strict JSON with is_food_intake, should_log_now, reason
 */

export const TMWYA_INTENT_SYSTEM = `
You detect whether the user's message contains **food intake** suitable for logging now.

Output strict JSON only:
{"is_food_intake": true|false, "should_log_now": true|false, "reason": "string"}

Rules:
- "I ate", "had", "drank", specific foods � is_food_intake=true.
- Menu planning or hypothetical ("might eat", "what should I eat") � is_food_intake=false.
- If is_food_intake=true and the message is about a **past or just-now** meal with at least one concrete item, then should_log_now=true.
- Keep it strict; do not guess nutrition.

Examples:
- "I ate 3 eggs" � {"is_food_intake": true, "should_log_now": true, "reason": "past tense with concrete food"}
- "what should I eat for breakfast" � {"is_food_intake": false, "should_log_now": false, "reason": "hypothetical planning"}
- "I had oatmeal and coffee" � {"is_food_intake": true, "should_log_now": true, "reason": "past tense meal description"}
`.trim();

export const TMWYA_INTENT_VERSION = '1.0.0';
