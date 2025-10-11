/**
 * Undo Swarm
 *
 * Deletes the last meal (24-hour safety window).
 * RLS-enforced ownership protection.
 */

import { getSupabase } from '../../supabase';

export interface UndoResult {
  success: boolean;
  deletedMealId?: string;
  mealSlot?: string;
  timestamp?: string;
  error?: string;
}

/**
 * Undo last meal
 */
export async function undoLastMeal(userId: string): Promise<UndoResult> {
  const supabase = getSupabase();

  try {
    // Find last meal (within 24 hours for safety)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: lastMeal, error: findError } = await supabase
      .from('meal_logs')
      .select('id, ts, meal_slot')
      .eq('user_id', userId)
      .gte('ts', twentyFourHoursAgo)
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      return {
        success: false,
        error: 'Failed to find last meal'
      };
    }

    if (!lastMeal) {
      return {
        success: false,
        error: 'No recent meal found (within 24 hours)'
      };
    }

    // Delete meal_items first (cascade should handle this, but explicit is safer)
    const { error: itemsError } = await supabase
      .from('meal_items')
      .delete()
      .eq('log_id', lastMeal.id);

    if (itemsError) {
      console.error('[undoSwarm] Failed to delete meal_items:', itemsError);
      // Continue anyway - cascade should clean up
    }

    // Delete meal_log (RLS enforces ownership)
    const { error: logError } = await supabase
      .from('meal_logs')
      .delete()
      .eq('id', lastMeal.id)
      .eq('user_id', userId); // Explicit ownership check

    if (logError) {
      return {
        success: false,
        error: 'Failed to delete meal log'
      };
    }

    return {
      success: true,
      deletedMealId: lastMeal.id,
      mealSlot: lastMeal.meal_slot,
      timestamp: lastMeal.ts
    };
  } catch (error: any) {
    console.error('[undoSwarm] Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
