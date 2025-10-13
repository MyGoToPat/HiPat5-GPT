import { supabase } from '@/lib/supabase';
import { FoodResult } from './format';

export async function logMeal(
  result: FoodResult,
  mealSlot: string,
  timestamp?: string
): Promise<{ success: boolean; error?: string; mealLogId?: string }> {
  try {
    const ts = timestamp || new Date().toISOString();

    // Call RPC with correct signature: log_meal(p_ts, p_meal_slot_text, p_note, p_items)
    const { data: mealLogId, error } = await supabase.rpc('log_meal', {
      p_ts: ts,
      p_meal_slot_text: mealSlot,
      p_note: null,
      p_items: result.items.map((item, index) => ({
        position: index + 1,
        name: item.name,
        quantity: String(item.quantity || 1),
        unit: item.unit || 'serving',
        energy_kcal: String(item.macros.kcal || 0),
        protein_g: String(item.macros.protein_g || 0),
        fat_g: String(item.macros.fat_g || 0),
        carbs_g: String(item.macros.carbs_g || 0),
        fiber_g: String(item.macros.fiber_g || 0)
      }))
    });

    if (error) {
      console.error('log_meal RPC error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, mealLogId: mealLogId as string };
  } catch (err) {
    console.error('logMeal error:', err);
    return { success: false, error: String(err) };
  }
}
