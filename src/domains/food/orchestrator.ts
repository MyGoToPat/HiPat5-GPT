import { FoodResult } from './format';
import { spendCredits, calculateCost } from '@/lib/credits/spendHook';

const FOOD_SYSTEM_PROMPT = `You are a precise nutrition calculator. Given a meal description, return ONLY valid JSON with this exact structure:
{
  "items": [
    {
      "name": "food name",
      "quantity": number,
      "unit": "oz|cup|piece|large|medium|small",
      "assumptions": ["cooked", "large eggs"],
      "macros": {
        "kcal": number,
        "protein_g": number,
        "fat_g": number,
        "carbs_g": number,
        "fiber_g": number
      }
    }
  ],
  "totals": {
    "kcal": number,
    "protein_g": number,
    "fat_g": number,
    "carbs_g": number,
    "fiber_g": number
  },
  "assumptions": ["assume cooked", "large eggs unless specified"]
}

CRITICAL RULES:
- ALWAYS assume cooked unless specified raw
- ALWAYS assume large eggs unless specified
- Use USDA standard values
- Round all macros to whole numbers
- totals must equal sum of items (±1g acceptable for rounding)`;

export async function handleFoodRequest(userMessage: string): Promise<FoodResult> {
  try {
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: FOOD_SYSTEM_PROMPT },
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

    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const cost = calculateCost('gpt-4o-mini', inputTokens, outputTokens);

    await spendCredits(cost, `TMWYA: ${userMessage.substring(0, 50)}`);

    return result as FoodResult;
  } catch (err) {
    console.error('Food orchestrator error:', err);
    throw err;
  }
}
