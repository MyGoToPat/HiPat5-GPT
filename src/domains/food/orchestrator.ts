import { FoodResult } from './format';
import { spendCredits, calculateCost } from '@/lib/credits/spendHook';
import { TMWYA_INTENT_SYSTEM } from '@/agents/tmwya/intent.system';
import { TMWYA_NORMALIZE_SYSTEM } from '@/agents/tmwya/normalize.system';

/**
 * STEP 1: Intent Detection
 * Uses TMWYA_INTENT_SYSTEM prompt to determine if message is food intake
 */
async function detectIntent(userMessage: string): Promise<{
  is_food_intake: boolean;
  should_log_now: boolean;
  reason: string;
}> {
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OpenAI API key not configured');

  console.log('[SWARM] intent detection → calling OpenAI');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: TMWYA_INTENT_SYSTEM },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  console.log('[SWARM] intent result:', result);

  return result;
}

/**
 * STEP 2: Normalization
 * Uses TMWYA_NORMALIZE_SYSTEM to extract structure (no macro calculation)
 */
async function normalizeStructure(userMessage: string): Promise<any> {
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OpenAI API key not configured');

  console.log('[SWARM] normalize → calling OpenAI');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: TMWYA_NORMALIZE_SYSTEM },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  console.log('[SWARM] normalize ok:', {
    items: result.items?.length || 0,
    slot: result.meal_slot
  });

  return result;
}

/**
 * STEP 3: Resolver (Macro Calculation)
 * This is the ONLY step that computes nutrition values
 */
const RESOLVER_SYSTEM_PROMPT = `You are a USDA nutrition calculator. Given normalized food items, compute exact macros.

Input format:
{
  "items": [{"name": "egg", "quantity": 3, "unit": "item", ...}]
}

Output format (STRICT JSON):
{
  "items": [
    {
      "name": "egg",
      "quantity": 3,
      "unit": "item",
      "macros": {
        "kcal": 216,
        "protein_g": 18,
        "fat_g": 15,
        "carbs_g": 1,
        "fiber_g": 0
      }
    }
  ],
  "totals": {
    "kcal": 216,
    "protein_g": 18,
    "fat_g": 15,
    "carbs_g": 1,
    "fiber_g": 0
  }
}

CRITICAL RULES:
- ALWAYS assume cooked unless specified raw
- ALWAYS assume large eggs unless specified
- Use USDA standard values
- Round all macros to whole numbers
- totals MUST equal sum of items`;

async function resolveMacros(normalized: any): Promise<FoodResult> {
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!openaiKey) throw new Error('OpenAI API key not configured');

  console.log('[SWARM] resolver → calling OpenAI');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: RESOLVER_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(normalized) }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  const inputTokens = data.usage?.prompt_tokens || 0;
  const outputTokens = data.usage?.completion_tokens || 0;
  const cost = calculateCost('gpt-4o-mini', inputTokens, outputTokens);

  await spendCredits(cost, `TMWYA: resolver`);

  console.log('[SWARM] resolver ok:', {
    kcal: result.totals?.kcal,
    protein_g: result.totals?.protein_g
  });

  return result as FoodResult;
}

/**
 * Main TMWYA Orchestrator - Three-Step Pipeline
 * 1. Intent Detection (is this food?)
 * 2. Normalization (extract structure)
 * 3. Resolution (compute macros)
 */
export async function handleFoodRequest(userMessage: string): Promise<FoodResult> {
  try {
    // STEP 1: Intent (optional - can skip if already detected by isMealText)
    const intent = await detectIntent(userMessage);
    if (!intent.is_food_intake || !intent.should_log_now) {
      throw new Error(`Not food intake: ${intent.reason}`);
    }

    // STEP 2: Normalize
    const normalized = await normalizeStructure(userMessage);

    // STEP 3: Resolve macros
    const resolved = await resolveMacros(normalized);

    return resolved;
  } catch (err) {
    console.error('[SWARM] orchestrator error:', err);
    throw err;
  }
}
