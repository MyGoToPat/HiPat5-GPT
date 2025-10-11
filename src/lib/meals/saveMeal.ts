/**
 * Save Meal with Production Schema
 * Works with existing meal_logs and meal_items tables
 * NO database modifications - strictly uses existing columns
 */

import { getSupabase } from '../supabase';
import {
  MealLogColumns,
  MealItemColumns,
  MealTotals,
  MealSlot,
  MealSource,
  MealSlotEnum,
  MealSourceEnum,
  hasColumn
} from './schemaMap';

// UUID validator to prevent "invalid input syntax for uuid" errors
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface SaveMealInput {
  userId: string;
  messageId?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit?: string;
    energy_kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
    brand?: string;
    description?: string;
  }>;
  mealSlot?: MealSlot;
  timestamp?: string;        // ISO8601, defaults to now()
  note?: string;
  clientConfidence?: number;
  source?: MealSource;
}

export interface SaveMealResult {
  ok: boolean;
  mealLogId?: string;
  itemsCount?: number;
  totals?: MealTotals;
  error?: string;
}

/**
 * Compute dual-key totals JSONB (required for meal_logs NOT NULL constraint)
 * Includes both kcal and calories for future-proofing
 */
function computeTotals(items: SaveMealInput['items']): MealTotals {
  const totals: MealTotals = {
    kcal: 0,
    calories: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    fiber_g: 0
  };

  for (const item of items) {
    totals.kcal += item.energy_kcal || 0;
    totals.protein_g += item.protein_g || 0;
    totals.fat_g += item.fat_g || 0;
    totals.carbs_g += item.carbs_g || 0;
    totals.fiber_g += item.fiber_g || 0;
  }

  // Dual-key: calories = kcal for compatibility
  totals.calories = totals.kcal;

  return totals;
}

/**
 * Save meal to production schema (meal_logs + meal_items)
 * Atomic: if meal_items insertion fails, meal_logs row is deleted
 */
export async function saveMeal(input: SaveMealInput): Promise<SaveMealResult> {
  const supabase = getSupabase();
  let mealLogId: string | null = null;

  try {
    // Validate input
    if (!input.items || input.items.length === 0) {
      return { ok: false, error: 'No items provided' };
    }

    // Guard message_id: only use if it's a valid UUID (prevents 400 errors)
    const safeMessageId =
      input.messageId && UUID_RE.test(input.messageId) ? input.messageId : null;

    // Compute totals JSONB (REQUIRED for NOT NULL constraint)
    const totals = computeTotals(input.items);

    // Compute micros_totals (fiber for now)
    const microsTotals = {
      fiber_g: totals.fiber_g
    };

    // Build meal_logs insert payload
    const mealLogPayload: Record<string, any> = {
      [MealLogColumns.userId]: input.userId,
      [MealLogColumns.timestamp]: input.timestamp || new Date().toISOString(),
      [MealLogColumns.mealSlot]: input.mealSlot || MealSlotEnum.UNSPECIFIED,
      [MealLogColumns.source]: input.source || MealSourceEnum.TEXT,
      [MealLogColumns.totals]: totals,  // JSONB, NOT NULL - dual-key format
      [MealLogColumns.microsTotals]: microsTotals
    };

    // Add optional fields only if they exist in schema
    if (hasColumn('meal_logs', 'message_id') && safeMessageId) {
      mealLogPayload[MealLogColumns.messageId] = safeMessageId;
    }

    if (hasColumn('meal_logs', 'note') && input.note) {
      mealLogPayload[MealLogColumns.note] = input.note;
    }

    if (hasColumn('meal_logs', 'client_confidence') && input.clientConfidence !== undefined) {
      mealLogPayload[MealLogColumns.clientConfidence] = input.clientConfidence;
    }

    // Step 1: Insert meal_logs (with required totals JSONB)
    const { data: mealLogData, error: mealLogError } = await supabase
      .from('meal_logs')
      .insert(mealLogPayload)
      .select('id')
      .single();

    if (mealLogError || !mealLogData) {
      console.error('[saveMeal] Failed to insert meal_logs:', {
        error: mealLogError,
        payload: { ...mealLogPayload, [MealLogColumns.userId]: '<redacted>' }
      });
      return {
        ok: false,
        error: `Failed to insert meal log: ${mealLogError?.message || 'Unknown error'}`
      };
    }

    mealLogId = mealLogData.id;

    // Step 2: Insert meal_items (batch)
    const mealItemsPayload = input.items.map((item, index) => ({
      [MealItemColumns.mealLogId]: mealLogId,
      [MealItemColumns.name]: item.name,
      [MealItemColumns.quantity]: item.quantity || 1,
      [MealItemColumns.unit]: item.unit || null,
      [MealItemColumns.position]: index,
      [MealItemColumns.energyKcal]: item.energy_kcal || 0,
      [MealItemColumns.proteinG]: item.protein_g || 0,
      [MealItemColumns.fatG]: item.fat_g || 0,
      [MealItemColumns.carbsG]: item.carbs_g || 0,
      [MealItemColumns.fiberG]: item.fiber_g || 0,
      ...(item.brand && hasColumn('meal_items', 'brand') ? { [MealItemColumns.brand]: item.brand } : {}),
      ...(item.description && hasColumn('meal_items', 'description') ? { [MealItemColumns.description]: item.description } : {})
    }));

    const { error: itemsError } = await supabase
      .from('meal_items')
      .insert(mealItemsPayload);

    if (itemsError) {
      console.error('[saveMeal] Failed to insert meal_items:', {
        error: itemsError,
        mealLogId,
        itemsCount: input.items.length
      });

      // ATOMICITY: Delete the meal_logs row since items failed
      const { error: deleteError } = await supabase
        .from('meal_logs')
        .delete()
        .eq('id', mealLogId);

      if (deleteError) {
        console.error('[saveMeal] CRITICAL: Failed to rollback meal_logs after items error:', {
          mealLogId,
          deleteError
        });
      }

      return {
        ok: false,
        error: `Failed to insert meal items: ${itemsError.message}`
      };
    }

    // Success
    return {
      ok: true,
      mealLogId,
      itemsCount: input.items.length,
      totals
    };

  } catch (error: any) {
    console.error('[saveMeal] Unexpected error:', {
      error: error.message,
      mealLogId,
      itemsCount: input.items?.length
    });

    // Attempt cleanup if we created a meal_logs row
    if (mealLogId) {
      try {
        await supabase.from('meal_logs').delete().eq('id', mealLogId);
      } catch (cleanupError) {
        console.error('[saveMeal] CRITICAL: Failed to cleanup meal_logs after unexpected error:', cleanupError);
      }
    }

    return {
      ok: false,
      error: error.message || 'Unexpected error occurred'
    };
  }
}
