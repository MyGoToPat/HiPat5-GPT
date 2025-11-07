/**
 * TMWYA Pipeline - Tell Me What You Ate
 *
 * Orchestrates the 26-agent swarm for meal logging.
 * Flow: Input → Parse → Resolve → Calculate → Verify → Log → Update Dashboard
 */

import { callChat } from '../chat';
import { fetchFoodMacros } from '../food';
import { saveMeal } from '../meals/saveMeal';
import { getSupabase } from '../supabase';
import { hasRoleAccess } from '../roleAccess';
import type {
  AnalysisResult,
  MealNLUParseResult,
  NormalizedMealData,
  FoodResolutionResponse,
  TDEEComparison
} from '../../types/food';

interface TMWYAInput {
  userMessage: string;
  source: 'text' | 'voice' | 'photo' | 'barcode';
  userId: string;
  imageData?: string; // base64 for photo/barcode
}

interface TMWYAResult {
  ok: boolean;
  analysisResult?: AnalysisResult;
  normalizedMeal?: NormalizedMealData;
  tdeeComparison?: TDEEComparison;
  error?: string;
  step?: string; // Which step failed
}

/**
 * Main TMWYA Pipeline
 * Processes food logging from any input source
 */
export async function runTMWYAPipeline(input: TMWYAInput): Promise<TMWYAResult> {
  try {
    console.log('[SWARM] persona loaded: patSystem.v2');
    console.log('[TMWYA] Starting pipeline for:', input.source);

    // Check role access
    const hasAccess = await hasRoleAccess(input.userId, 'TMWYA');
    if (!hasAccess) {
      return {
        ok: false,
        error: 'TMWYA feature not available for your account tier',
        step: 'role_check'
      };
    }

    // Step 1: Parse the input based on source
    let parseResult: MealNLUParseResult;

    if (input.source === 'text' || input.source === 'voice') {
      parseResult = await parseTextInput(input.userMessage);
    } else if (input.source === 'photo') {
      parseResult = await parsePhotoInput(input.imageData!, input.userMessage);
    } else if (input.source === 'barcode') {
      parseResult = await parseBarcodeInput(input.imageData!);
    } else {
      return { ok: false, error: 'Unsupported input source', step: 'input_validation' };
    }

    if (!parseResult || parseResult.items.length === 0) {
      return { ok: false, error: 'No food items detected', step: 'parsing' };
    }

    // Step 2: Resolve foods and calculate macros
    const resolvedItems = await Promise.all(
      parseResult.items.map(async (item) => {
        const resolution = await resolveFoodItem(item.name, item.brand, item.qty, item.unit);
        return {
          name: item.name,
          brand: item.brand,
          candidates: resolution.candidates,
          grams: resolution.candidates[0]?.macros ? calculateGrams(item.qty || 1, item.unit) : 100,
          macros: resolution.candidates[0]?.macros,
          confidence: resolution.candidates[0]?.confidence || 0.7,
          source_hints: { originalText: item.originalText, cache_hit: resolution.cache_hit },
          originalText: item.originalText
        };
      })
    );

    // Step 3: Create Analysis Result for Verification Screen
    const analysisResult: AnalysisResult = {
      items: resolvedItems,
      meal_slot: parseResult.meal_slot || determineMealSlot(),
      source: input.source,
      originalInput: input.userMessage
    };

    // Step 4: Get TDEE comparison for verification screen
    const tdeeComparison = await getTDEEComparison(input.userId, analysisResult);

    console.log('[TMWYA] Pipeline complete, ready for verification');

    return {
      ok: true,
      analysisResult,
      tdeeComparison,
      step: 'verification_ready'
    };

  } catch (error: any) {
    console.error('[TMWYA] Pipeline error:', error);
    return {
      ok: false,
      error: error.message || 'Unknown pipeline error',
      step: 'unknown'
    };
  }
}

/**
 * Parse text/voice input using Meal NLU Parser agent
 */
async function parseTextInput(message: string): Promise<MealNLUParseResult> {
  // Call tmwya-meal-nlu-parser agent
  const result = await callChat(
    [
      {
        role: 'system',
        content: `Parse food items from this meal description.

EXTRACT:
- name: Food item name
- qty: Numeric quantity (if specified)
- unit: Unit of measurement (g, oz, cup, piece, serving)
- brand: Brand name (if mentioned)
- prep_method: Cooking method (grilled, fried, raw, baked)

RULES:
- Split compound items: "burger and fries" → 2 items
- Default qty to 1 if not specified
- Default unit to "serving" if not specified
- Detect meal slot from time/context (breakfast, lunch, dinner, snack)

OUTPUT JSON:
{
  "items": [{"name": "string", "qty": number, "unit": "string", "brand": "string", "prep_method": "string", "originalText": "string"}],
  "meal_slot": "breakfast|lunch|dinner|snack|unknown",
  "confidence": 0.0-1.0,
  "clarifications_needed": []
}`
      },
      { role: 'user', content: message }
    ],
    {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_output_tokens: 400,
      response_format: 'json'
    }
  );

  if (!result.ok) {
    throw new Error(`NLU parsing failed: ${result.error}`);
  }

  // Handle both JSON and potential text responses
  let parsed: MealNLUParseResult;
  if (typeof result.content === 'string') {
    try {
      parsed = JSON.parse(result.content);
    } catch (jsonError) {
      console.warn('[TMWYA] LLM returned non-JSON, attempting fallback parsing:', result.content.substring(0, 100));

      // Fallback: Try to extract structured data from text response
      const fallbackResult = parseTextFallback(result.content, message);
      if (fallbackResult) {
        console.info('[TMWYA] Fallback parsing succeeded');
        parsed = fallbackResult;
      } else {
        console.warn('[TMWYA] Fallback parsing failed, using minimal fallback');
        // Last resort: create minimal valid structure
        parsed = {
          items: [{
            name: message.substring(0, 50),
            qty: 1,
            unit: 'serving',
            originalText: message
          }],
          meal_slot: 'lunch',
          confidence: 0.3,
          clarifications_needed: ['Unable to parse meal details automatically']
        };
      }
    }
  } else {
    parsed = result.content;
  }

  return parsed as MealNLUParseResult;
}

/**
 * Fallback parser when LLM returns text instead of JSON
 */
function parseTextFallback(text: string, originalMessage: string): MealNLUParseResult | null {
  try {
    // Simple regex-based extraction for common patterns
    const items: any[] = [];
    const lines = text.split('\n').filter(line => line.trim());

    for (const line of lines) {
      // Look for patterns like "2 eggs", "1 cup oatmeal", "Big Mac"
      const qtyMatch = line.match(/^(\d+(?:\.\d+)?)?\s*(cup|cups|oz|g|grams?|piece|pieces|serving|servings?)?\s*(.+)$/i);
      if (qtyMatch) {
        const qty = qtyMatch[1] ? parseFloat(qtyMatch[1]) : 1;
        const unit = qtyMatch[2] || 'serving';
        const name = qtyMatch[3].trim();

        if (name && name.length > 1) {
          items.push({
            name: name,
            qty: qty,
            unit: unit.toLowerCase(),
            originalText: line.trim()
          });
        }
      } else if (line.trim() && !line.toLowerCase().includes('meal') && !line.toLowerCase().includes('breakfast')) {
        // Fallback: treat as single item
        items.push({
          name: line.trim(),
          qty: 1,
          unit: 'serving',
          originalText: line.trim()
        });
      }
    }

    if (items.length === 0) {
      // Last resort: treat entire message as one item
      items.push({
        name: originalMessage.substring(0, 50),
        qty: 1,
        unit: 'serving',
        originalText: originalMessage
      });
    }

    return {
      items: items,
      meal_slot: 'lunch', // Default assumption
      confidence: 0.5, // Lower confidence for fallback parsing
      clarifications_needed: []
    };
  } catch (error) {
    console.error('[TMWYA] Fallback parsing failed:', error);
    return null;
  }
}

/**
 * Parse photo input using OpenAI Vision (will switch to Gemini later)
 */
async function parsePhotoInput(imageData: string, context: string): Promise<MealNLUParseResult> {
  // TODO: Implement Vision API call
  // For now, return a placeholder that triggers manual entry
  return {
    items: [
      {
        name: 'Unknown food from photo',
        originalText: context || 'Photo upload',
        qty: 1,
        unit: 'serving'
      }
    ],
    meal_slot: determineMealSlot(),
    confidence: 0.3, // Low confidence triggers manual search
    clarifications_needed: ['Please describe what you ate or search manually']
  };
}

/**
 * Parse barcode input
 */
async function parseBarcodeInput(imageData: string): Promise<MealNLUParseResult> {
  // TODO: Implement barcode detection and OpenFoodFacts lookup
  return {
    items: [
      {
        name: 'Unknown barcode product',
        originalText: 'Barcode scan',
        qty: 1,
        unit: 'serving'
      }
    ],
    meal_slot: determineMealSlot(),
    confidence: 0.5,
    clarifications_needed: ['Could not read barcode. Please enter manually.']
  };
}

/**
 * Resolve food item to macros using edge function + cache
 */
async function resolveFoodItem(
  name: string,
  brand?: string,
  qty?: number,
  unit?: string
): Promise<FoodResolutionResponse> {
  try {
    // Check cache first
    const cacheKey = `${name.toLowerCase()}:${brand?.toLowerCase() || 'generic'}`;
    const supabase = getSupabase();

    const { data: cached } = await supabase
      .from('food_cache')
      .select('*')
      .eq('id', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached) {
      console.log('[TMWYA] Cache hit for:', name);
      return {
        ok: true,
        candidates: [
          {
            name: cached.name,
            brand: cached.brand,
            macros: cached.macros,
            confidence: cached.confidence
          }
        ],
        cache_hit: true,
        source_db: cached.source_db
      };
    }

    // Call food macros edge function
    const { ok, macros, error } = await fetchFoodMacros(name);

    if (!ok || !macros) {
      console.warn('[TMWYA] Food resolution failed:', error);
      // Return estimated macros based on food type
      return {
        ok: true,
        candidates: [
          {
            name,
            brand,
            macros: estimateMacros(name),
            confidence: 0.5
          }
        ],
        cache_hit: false,
        source_db: 'estimated'
      };
    }

    // Cache the result
    await supabase.from('food_cache').insert({
      id: cacheKey,
      name,
      brand,
      serving_size: '100g',
      grams_per_serving: 100,
      macros,
      source_db: 'USDA',
      confidence: 0.9
    }).select().maybeSingle();

    return {
      ok: true,
      candidates: [
        {
          name,
          brand,
          macros,
          confidence: 0.9
        }
      ],
      cache_hit: false,
      source_db: 'USDA'
    };

  } catch (error: any) {
    console.error('[TMWYA] Resolution error:', error);
    return {
      ok: false,
      candidates: [],
      cache_hit: false,
      error: error.message
    };
  }
}

/**
 * Estimate macros when no data available
 */
function estimateMacros(foodName: string) {
  const lower = foodName.toLowerCase();

  // Protein-rich foods
  if (lower.includes('chicken') || lower.includes('beef') || lower.includes('fish') || lower.includes('egg')) {
    return { kcal: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 }; // ~100g chicken breast
  }

  // Carb-rich foods
  if (lower.includes('rice') || lower.includes('pasta') || lower.includes('bread') || lower.includes('potato')) {
    return { kcal: 130, protein_g: 2.7, carbs_g: 28, fat_g: 0.3 }; // ~100g cooked rice
  }

  // Fat-rich foods
  if (lower.includes('avocado') || lower.includes('nuts') || lower.includes('cheese') || lower.includes('oil')) {
    return { kcal: 160, protein_g: 2, carbs_g: 9, fat_g: 15 }; // ~100g avocado
  }

  // Mixed/unknown - moderate macros
  return { kcal: 150, protein_g: 10, carbs_g: 20, fat_g: 5 };
}

/**
 * Calculate grams from quantity + unit
 */
function calculateGrams(qty: number, unit?: string): number {
  if (!unit || unit === 'g' || unit === 'gram' || unit === 'grams') {
    return qty;
  }

  const unitLower = unit.toLowerCase();

  // Common conversions
  const conversions: Record<string, number> = {
    'oz': 28.35,
    'ounce': 28.35,
    'lb': 453.59,
    'pound': 453.59,
    'cup': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tsp': 5,
    'teaspoon': 5,
    'piece': 100, // Estimate
    'serving': 100, // Estimate
    'slice': 30,
    'egg': 50,
    'banana': 120,
    'apple': 180
  };

  return (conversions[unitLower] || 100) * qty;
}

/**
 * Determine meal slot based on current time
 */
function determineMealSlot(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  return 'snack';
}

/**
 * Get TDEE comparison for verification screen
 */
async function getTDEEComparison(userId: string, analysis: AnalysisResult): Promise<TDEEComparison> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  // Calculate meal totals
  const mealTotals = analysis.items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + (item.macros?.kcal || 0),
      protein_g: acc.protein_g + (item.macros?.protein_g || 0),
      carbs_g: acc.carbs_g + (item.macros?.carbs_g || 0),
      fat_g: acc.fat_g + (item.macros?.fat_g || 0)
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  // Get user targets
  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('tdee, protein_g')
    .eq('user_id', userId)
    .maybeSingle();

  const dailyTarget = metrics?.tdee || 2000;
  const proteinTarget = metrics?.protein_g || 150;

  // Get today's consumed
  const { data: rollup } = await supabase
    .from('day_rollups')
    .select('totals')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const todayConsumed = rollup?.totals?.kcal || 0;
  const todayProtein = rollup?.totals?.protein_g || 0;

  const remaining = dailyTarget - (todayConsumed + mealTotals.kcal);
  const proteinRemaining = proteinTarget - (todayProtein + mealTotals.protein_g);
  const mealPct = (mealTotals.kcal / dailyTarget) * 100;
  const onTrack = remaining >= 0 && proteinRemaining <= (proteinTarget * 0.3); // Within 30% of protein goal

  return {
    meal_kcal: mealTotals.kcal,
    daily_kcal_consumed: todayConsumed + mealTotals.kcal,
    daily_kcal_target: dailyTarget,
    daily_kcal_remaining: remaining,
    meal_as_pct_of_daily: Math.round(mealPct),
    protein_consumed: todayProtein + mealTotals.protein_g,
    protein_target: proteinTarget,
    protein_remaining: proteinRemaining,
    on_track: onTrack,
    message: onTrack
      ? `On track! ${Math.round(remaining)} kcal and ${Math.round(proteinRemaining)}g protein remaining.`
      : remaining < 0
      ? `Over budget by ${Math.abs(Math.round(remaining))} kcal. Consider lighter choices for remaining meals.`
      : `Need ${Math.round(proteinRemaining)}g more protein today. Add a protein source to your next meal.`
  };
}

/**
 * Log meal after verification
 */
export async function logVerifiedMeal(normalizedMeal: NormalizedMealData): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await saveMeal(normalizedMeal);

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    console.log('[TMWYA] Meal logged successfully:', result.id);

    // Day rollup is updated automatically via database trigger

    return { ok: true };
  } catch (error: any) {
    console.error('[TMWYA] Log meal error:', error);
    return { ok: false, error: error.message };
  }
}
