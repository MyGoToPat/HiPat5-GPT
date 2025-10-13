import { supabase } from '@/lib/supabase';
import { FoodResult } from './format';

export async function logMeal(
  result: FoodResult,
  mealSlot: string,
  timestamp?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const ts = timestamp || new Date().toISOString();

    const { error } = await supabase.rpc('log_meal', {
      p_ts: ts,
      p_meal_slot: mealSlot,
      p_source: 'tmwya',
      p_totals: {
        kcal: result.totals.kcal,
        protein_g: result.totals.protein_g,
        fat_g: result.totals.fat_g,
        carbs_g: result.totals.carbs_g,
        fiber_g: result.totals.fiber_g || 0
      },
      p_items: result.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        energy_kcal: item.macros.kcal,
        protein_g: item.macros.protein_g,
        fat_g: item.macros.fat_g,
        carbs_g: item.macros.carbs_g,
        fiber_g: item.macros.fiber_g || 0
      }))
    });

    if (error) {
      console.error('log_meal RPC error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('logMeal error:', err);
    return { success: false, error: String(err) };
  }
}
