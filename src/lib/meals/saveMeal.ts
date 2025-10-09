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

    // Get or create active session for user
    const { data: session, error: sessionError } = await supabase
      .rpc('get_or_create_active_session', {
        p_user_id: user.id,
        p_session_type: 'general'
      });

    if (sessionError || !session || !session[0]) {
      console.error('Error getting session:', sessionError);
      return { ok: false, error: 'Failed to get chat session' };
    }

    const sessionId = session[0].id;

    // 1. Insert into meals (renamed from meal_logs)
    const { data: mealData, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        session_id: normalizedMeal.meal.session_id || sessionId,
        eaten_at: normalizedMeal.meal.eaten_at,
        name: normalizedMeal.meal.name,
        meal_slot: normalizedMeal.meal.meal_slot,
        source: normalizedMeal.meal.source,
        totals: normalizedMeal.meal.totals,
        micros_totals: normalizedMeal.meal.micros_totals || null,  // Include fiber totals
        note: normalizedMeal.meal.note,
        client_confidence: normalizedMeal.meal.client_confidence,
      })
      .select('id')
      .single();

    if (mealError) {
      console.error('Error inserting meal:', mealError);
      return { ok: false, error: `Failed to save meal: ${mealError.message}` };
    }

    const mealId = mealData.id;

    // 2. Batch insert meal_items
    if (normalizedMeal.mealItems.length > 0) {
      const mealItemsToInsert = normalizedMeal.mealItems.map(item => ({
        meal_id: mealId, // Changed from meal_log_id
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
        // Try to clean up the meal if items failed
        await supabase.from('meals').delete().eq('id', mealId);
        return { ok: false, error: `Failed to save meal items: ${itemsError.message}` };
      }
    }

    return { ok: true, id: mealId };
  } catch (error: any) {
    console.error('Unexpected error in saveMeal:', error);
    return { ok: false, error: error.message || 'Unexpected error occurred' };
  }
}