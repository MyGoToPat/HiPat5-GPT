import { runPersonalityRouter, normalizeIntent } from '../personality/routerAgent';
import { normalizeNutritionIntent } from './nutritionIntent';

export async function detectIntent(inputText: string): Promise<import('../personality/routerAgent').RouterDecision> {
  // --- existing upstream detectors (leave as-is) ---
  // const webIntent = detectWebIntent(inputText)  // if you have one already
  const webIntent: any = (globalThis as any).__hipat_web_intent || {}; // guard if absent

  // --- nutrition normalization (authoritative) ---
  const n = normalizeNutritionIntent(inputText);

  let finalIntent: 'ama' | 'meal_logging' | 'general' = n.finalIntent;
  let route_to: 'ama' | 'tmwya' = finalIntent === 'meal_logging' ? 'tmwya' : 'ama';
  let use_gemini = false;
  let reason = '';

  if (finalIntent === 'meal_logging') {
    reason = 'meal_logging';
  } else if (finalIntent === 'ama' && n.ama_nutrition_estimate) {
    reason = 'nutrition_estimate';
  } else {
    reason = 'general';
  }

  // If your web-intent detector says we need search, flip use_gemini
  if (finalIntent === 'ama' && webIntent.needs_web) {
    use_gemini = true;
    reason = 'ama_needs_web';
  }

  const decision: import('../personality/routerAgent').RouterDecision = {
    intent: finalIntent,
    route_to,
    use_gemini,
    reason,
    ama_nutrition_estimate: !!n.ama_nutrition_estimate,
  };
  console.info('[router]', decision);
  return decision;
}

/**
 * Check if intent should trigger a role
 */
export function shouldTriggerRole(intent: string): boolean {
  const roleIntents = [
    'food_question',
    'food_log',
    'food_undo',
    'kpi_today',
    'kpi_remaining',
  ];

  return roleIntents.includes(intent);
}