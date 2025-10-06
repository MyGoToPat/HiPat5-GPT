import { getSupabase } from '../supabase';
import type { NormalizedMealData } from '../../types/food';

export async function saveMeal(normalizedMeal: NormalizedMealData): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  try {
    const supabase = getSupabase();
    
    // Check for authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { ok: false, error: 'No authenticated user' };
    }

    // 1. Insert into meal_logs
    const { data: mealLogData, error: mealLogError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: user.id,
        ts: normalizedMeal.mealLog.ts,
        meal_slot: normalizedMeal.mealLog.meal_slot,
        source: normalizedMeal.mealLog.source,
        totals: normalizedMeal.mealLog.totals,
        micros_totals: normalizedMeal.mealLog.micros_totals || null,  // Include fiber totals
        note: normalizedMeal.mealLog.note,
        client_confidence: normalizedMeal.mealLog.client_confidence,
      })
      .select('id')
      .single();

    if (mealLogError) {
      console.error('Error inserting meal log:', mealLogError);
      return { ok: false, error: `Failed to save meal: ${mealLogError.message}` };
    }

    const mealLogId = mealLogData.id;

    // 2. Batch insert meal_items
    if (normalizedMeal.mealItems.length > 0) {
      const mealItemsToInsert = normalizedMeal.mealItems.map(item => ({
        meal_log_id: mealLogId,
        position: item.position,
        cache_id: item.cache_id,
        name: item.name,
        brand: item.brand,
        qty: item.qty,
        unit: item.unit,
        grams: item.grams,
        macros: item.macros,
        micros: item.micros,
        confidence: item.confidence,
        source_hints: item.source_hints,
      }));

      const { error: itemsError } = await supabase
        .from('meal_items')
        .insert(mealItemsToInsert);

      if (itemsError) {
        console.error('Error inserting meal items:', itemsError);
        // Try to clean up the meal log if items failed
        await supabase.from('meal_logs').delete().eq('id', mealLogId);
        return { ok: false, error: `Failed to save meal items: ${itemsError.message}` };
      }
    }

    return { ok: true, id: mealLogId };
  } catch (error: any) {
    console.error('Unexpected error in saveMeal:', error);
    return { ok: false, error: error.message || 'Unexpected error occurred' };
  }
}