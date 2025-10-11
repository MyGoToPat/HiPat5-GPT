/**
 * Meal Logger Agent
 *
 * Writes to database with idempotency protection.
 * Transaction-safe: rollback on failure.
 */

import { getSupabase } from '../../supabase';
import { generateMealFingerprint } from './idempotency';
import type { MacroSummary } from '../../cache/questionCache';
import type { ParsedTime } from './timeParser';

export interface LogMealInput {
  userId: string;
  summary: MacroSummary;
  parsedTime: ParsedTime;
  source: 'chat' | 'voice' | 'camera';
  messageId?: string;
}

export interface LogMealResult {
  success: boolean;
  mealLogId?: string;
  isDuplicate?: boolean;
  error?: string;
}

/**
 * Log meal to database (with idempotency)
 */
export async function logMeal(input: LogMealInput): Promise<LogMealResult> {
  const supabase = getSupabase();

  try {
    // Generate idempotency key
    const idempotencyKey = await generateMealFingerprint(
      input.userId,
      input.summary,
      input.parsedTime.timestamp
    );

    // Pre-check for duplicate (avoid round-trip)
    const { data: existing } = await supabase
      .from('meal_logs')
      .select('id')
      .eq('user_id', input.userId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      console.log('[logMeal] Dedupe: meal already logged', { idempotencyKey });
      return {
        success: true,
        mealLogId: existing.id,
        isDuplicate: true
      };
    }

    // Map source enum ('chat' → 'text')
    const sourceEnum = input.source === 'chat' ? 'text' : input.source;

    // Insert meal_logs
    const { data: mealLog, error: logError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: input.userId,
        idempotency_key: idempotencyKey,
        ts: input.parsedTime.timestamp,
        meal_slot: input.parsedTime.mealSlot,
        source: sourceEnum,
        totals: {
          kcal: input.summary.totals.kcal,
          protein_g: input.summary.totals.protein_g,
          fat_g: input.summary.totals.fat_g,
          carbs_g: input.summary.totals.carbs_g
        },
        micros_totals: {
          fiber_g: input.summary.totals.fiber_g
        }
      })
      .select('id')
      .single();

    // Handle unique constraint violation (race condition)
    if (logError?.code === '23505') {
      console.log('[logMeal] Dedupe: caught by DB constraint');
      const { data: dup } = await supabase
        .from('meal_logs')
        .select('id')
        .eq('user_id', input.userId)
        .eq('idempotency_key', idempotencyKey)
        .single();

      return {
        success: true,
        mealLogId: dup?.id,
        isDuplicate: true
      };
    }

    if (logError || !mealLog) {
      throw new Error(`Failed to create meal_log: ${logError?.message}`);
    }

    // Insert meal_items
    const itemsToInsert = input.summary.items.map(item => ({
      log_id: mealLog.id,
      user_id: input.userId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      energy_kcal: item.macros.kcal,
      protein_g: item.macros.protein_g,
      fat_g: item.macros.fat_g,
      carbs_g: item.macros.carbs_g,
      fiber_g: item.macros.fiber_g
    }));

    const { error: itemsError } = await supabase
      .from('meal_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Rollback: delete meal_log
      await supabase
        .from('meal_logs')
        .delete()
        .eq('id', mealLog.id);

      throw new Error(`Failed to insert meal_items: ${itemsError.message}`);
    }

    return {
      success: true,
      mealLogId: mealLog.id,
      isDuplicate: false
    };

  } catch (error: any) {
    console.error('[logMeal] Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
