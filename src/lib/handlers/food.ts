/**
 * Food Intent Handlers (Swarm 2.1)
 * Pure business logic for food-related intents
 * No UI coupling - handlers return data only
 */

import { getSupabase } from '../supabase';
import { saveMeal, type SaveMealInput } from '../meals/saveMeal';
import type { FoodItem } from '../personality/intentClassifier';
import { inferMealSlot } from '../meals/inferMealSlot';

export interface FoodMentionContext {
  userId: string;
  messageId?: string;
  mealSlot?: string;
  timestamp?: string;
}

export interface FoodMentionResult {
  ok: boolean;
  mealLogId?: string;
  itemsCount?: number;
  totals?: {
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
  };
  error?: string;
}

export interface FoodQuestionResult {
  ok: boolean;
  reply: string;
  items: FoodItem[];
}

export interface UndoResult {
  ok: boolean;
  removed: boolean;
  mealLogId?: string;
  message?: string;
}

/**
 * Handle food_mention intent - save meal to database
 */
export async function handleFoodMention(
  items: FoodItem[],
  ctx: FoodMentionContext
): Promise<FoodMentionResult> {
  if (!items || items.length === 0) {
    return {
      ok: false,
      error: 'No food items to log'
    };
  }

  // Infer meal slot if not provided
  const mealSlot = ctx.mealSlot || inferMealSlot(ctx.timestamp ? new Date(ctx.timestamp) : new Date());

  // Call existing saveMeal function
  const result = await saveMeal({
    userId: ctx.userId,
    messageId: ctx.messageId,
    items: items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      energy_kcal: item.energy_kcal,
      protein_g: item.protein_g,
      fat_g: item.fat_g,
      carbs_g: item.carbs_g,
      fiber_g: item.fiber_g
    })),
    mealSlot,
    timestamp: ctx.timestamp,
    source: 'chat'
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error
    };
  }

  return {
    ok: true,
    mealLogId: result.mealLogId,
    itemsCount: result.itemsCount,
    totals: result.totals
  };
}

/**
 * Format food items as bulleted list
 */
function formatBullets(items: FoodItem[]): string {
  return items.map(i =>
    `• ${i.name}: ${Math.round(i.energy_kcal)} kcal\n` +
    `  – Protein: ${Math.round(i.protein_g)}g • Fat: ${Math.round(i.fat_g)}g • Carbs: ${Math.round(i.carbs_g)}g • Fiber: ${Math.round(i.fiber_g ?? 0)}g`
  ).join('\n');
}

/**
 * Handle food_question intent - provide nutritional info without logging
 */
export async function handleFoodQuestion(items: FoodItem[]): Promise<FoodQuestionResult> {
  if (!items || items.length === 0) {
    return {
      ok: false,
      reply: 'I couldn\'t identify any food items in your question.',
      items: []
    };
  }

  // Format bulleted reply with CTA
  const bulleted = formatBullets(items);
  const reply = `${bulleted}\n\nSay "log" to save this.`;

  return {
    ok: true,
    reply,
    items
  };
}

/**
 * Handle log_that intent - log previously questioned food items
 */
export async function handleLogThat(
  items: FoodItem[],
  ctx: FoodMentionContext
): Promise<FoodMentionResult> {
  // Same as handleFoodMention but items come from session context
  return await handleFoodMention(items, ctx);
}

/**
 * Handle undo intent - delete most recent meal for user
 */
export async function handleUndoLast(userId: string): Promise<UndoResult> {
  const supabase = getSupabase();

  try {
    // Step 1: Get latest meal_log for user
    const { data: logs, error: logError } = await supabase
      .from('meal_logs')
      .select('id, ts')
      .eq('user_id', userId)
      .order('ts', { ascending: false })
      .limit(1);

    if (logError) {
      console.error('[handleUndoLast] Error fetching meal_logs:', logError);
      return {
        ok: false,
        removed: false,
        message: 'Error fetching recent meals'
      };
    }

    if (!logs || logs.length === 0) {
      return {
        ok: true,
        removed: false,
        message: 'No recent meal found to undo.'
      };
    }

    const mealLogId = logs[0].id;

    // Step 2: Delete meal_items for this meal_log
    const { error: itemsError } = await supabase
      .from('meal_items')
      .delete()
      .eq('meal_log_id', mealLogId);

    if (itemsError) {
      console.error('[handleUndoLast] Error deleting meal_items:', itemsError);
      return {
        ok: false,
        removed: false,
        message: 'Error removing meal items'
      };
    }

    // Step 3: Delete meal_log
    const { error: logDeleteError } = await supabase
      .from('meal_logs')
      .delete()
      .eq('id', mealLogId);

    if (logDeleteError) {
      console.error('[handleUndoLast] Error deleting meal_log:', logDeleteError);
      return {
        ok: false,
        removed: false,
        message: 'Error removing meal log'
      };
    }

    return {
      ok: true,
      removed: true,
      mealLogId
    };

  } catch (error: any) {
    console.error('[handleUndoLast] Unexpected error:', error);
    return {
      ok: false,
      removed: false,
      message: error.message || 'Unexpected error'
    };
  }
}
