import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { V1FoodItem, FoodLogResponse, ClarificationPlan } from '../../../src/types/foodlog.ts';
import { evaluateConfidence, canAutosave, identifyMissingFields } from './confidence.ts';
import { generateClarificationPlan, applyClarificationResponse } from './clarification.ts';
import { resolveMacros, calculateTotals, formatItemsForMessage } from './macroResolver.ts';

export interface ParsedMeal {
  items: V1FoodItem[];
  llmConfidence: number;
  rawResponse: string;
}

/**
 * Main meal logging handler
 * Routes between autosave, clarification, and verification
 */
export async function handleMealLogging(
  userMessage: string,
  userId: string,
  parsedMeal: ParsedMeal
): Promise<FoodLogResponse> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Step 1: Resolve macros for all items
    const macroResult = await resolveMacros(parsedMeal.items, userId);
    if (!macroResult.ok) {
      return {
        ok: false,
        kind: 'food_log',
        step: 'open_verify',
        message: 'Could not resolve nutrition data.',
        logged: false,
        needsClarification: false,
        analysisResult: {
          confidence: 0,
          items: [],
          totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        },
        error: macroResult.error,
      };
    }

    // Step 2: Evaluate confidence and gates
    const confidenceResult = evaluateConfidence(
      macroResult.items,
      macroResult.totals,
      parsedMeal.llmConfidence
    );

    // Step 3: Route based on confidence and gates
    if (canAutosave(confidenceResult.gates)) {
      // AUTOSAVE PATH
      return await autosaveMeal(supabase, userId, macroResult.items, macroResult.totals);
    }

    // Check what's missing
    const missingFields = identifyMissingFields(macroResult.items);

    if (missingFields.length > 0) {
      // CLARIFICATION PATH
      const clarificationPlan = generateClarificationPlan(macroResult.items, missingFields);

      return {
        ok: true,
        kind: 'food_log',
        step: 'needs_clarification',
        message: 'Need a couple details.',
        logged: false,
        needsClarification: true,
        analysisResult: {
          confidence: confidenceResult.overall,
          items: macroResult.items,
          totals: macroResult.totals,
        },
        clarificationPlan,
      };
    }

    // VERIFY PATH (low confidence but no obvious missing fields)
    return {
      ok: true,
      kind: 'food_log',
      step: 'open_verify',
      message: 'Please review.',
      logged: false,
      needsClarification: false,
      analysisResult: {
        confidence: confidenceResult.overall,
        items: macroResult.items,
        totals: macroResult.totals,
      },
    };
  } catch (error) {
    console.error('[mealHandler] Error:', error);
    return {
      ok: false,
      kind: 'food_log',
      step: 'open_verify',
      message: 'Error processing meal.',
      logged: false,
      needsClarification: false,
      analysisResult: {
        confidence: 0,
        items: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Autosave meal and generate undo token
 */
async function autosaveMeal(
  supabase: any,
  userId: string,
  items: V1FoodItem[],
  totals: any
): Promise<FoodLogResponse> {
  try {
    // Get user's day boundaries
    const { data: boundaries } = await supabase.rpc('get_user_day_boundaries', {
      p_user_id: userId,
      p_date: new Date().toISOString(),
    });

    // Log meal using log_meal RPC
    const { data: logResult, error: logError } = await supabase.rpc('log_meal', {
      p_user_id: userId,
      p_eaten_at: new Date().toISOString(),
      p_meal_slot: inferMealSlot(),
      p_source: 'text',
      p_totals: {
        kcal: totals.calories,
        protein_g: totals.protein,
        carbs_g: totals.carbs,
        fat_g: totals.fat,
        fiber_g: totals.fiber || 0,
      },
      p_items: items.map((item, idx) => ({
        position: idx,
        name: item.name,
        brand: item.brand,
        qty: item.quantity,
        unit: item.unit,
        macros: {
          kcal: item.macros!.calories,
          protein_g: item.macros!.protein,
          carbs_g: item.macros!.carbs,
          fat_g: item.macros!.fat,
        },
        micros: {
          fiber_g: item.macros!.fiber || 0,
        },
        confidence: item.confidence || 0.9,
      })),
    });

    if (logError) {
      console.error('[autosave] Log error:', logError);
      throw logError;
    }

    const mealLogId = logResult.meal_log_id;
    const mealItemsIds = logResult.meal_items_ids || [];

    // Generate undo token
    const undoToken = crypto.randomUUID();
    await supabase.from('undo_tokens').insert({
      id: undoToken,
      user_id: userId,
      meal_log_id: mealLogId,
      meal_items_ids: mealItemsIds,
    });

    // Format success message
    const itemsText = formatItemsForMessage(items);
    const message = `Saved: ${itemsText} · ${Math.round(totals.calories)} kcal.`;

    return {
      ok: true,
      kind: 'food_log',
      step: 'unified_complete',
      message,
      logged: true,
      needsClarification: false,
      analysisResult: {
        confidence: 0.95,
        items,
        totals,
      },
      undo_token: undoToken,
    };
  } catch (error) {
    console.error('[autosave] Error:', error);
    throw error;
  }
}

/**
 * Infer meal slot from current time
 */
function inferMealSlot(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 17 && hour < 22) return 'dinner';
  return 'snack';
}

/**
 * Handle clarification response
 * Reprocess meal with additional info
 */
export async function handleClarificationResponse(
  userId: string,
  clarificationText: string,
  previousItems: V1FoodItem[],
  previousMissing: string[]
): Promise<FoodLogResponse> {
  // Apply clarification to items
  const updatedItems = applyClarificationResponse(previousItems, clarificationText);

  // Re-run meal logging with updated items
  return await handleMealLogging(
    clarificationText,
    userId,
    {
      items: updatedItems,
      llmConfidence: 0.8,
      rawResponse: clarificationText,
    }
  );
}
