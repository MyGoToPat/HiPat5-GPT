/**
 * Macro Logging Helper Functions
 * Phase 7: Implements "log all", "log item", "log with adjustments" logic
 */

import { getSupabase } from '../supabase';
import { adjustItemQuantity, findItemByName, type ResolvedNutrition } from '../personality/nutritionResolver';

export interface MacroPayload {
  message_id: string;
  session_id: string;
  items: any[];
  totals: any;
  basis: string;
  consumed: boolean;
  created_at: string;
}

/**
 * Retrieves the last unconsumed macro payload from the current session
 * within the 48h actionable window
 */
export async function getLastUnconsumedMacroPayload(
  sessionId: string,
  userId: string
): Promise<MacroPayload | null> {
  const supabase = getSupabase();

  // 48h ago timestamp
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('chat_message_macros')
    .select('*')
    .eq('session_id', sessionId)
    .eq('consumed', false)
    .gte('created_at', fortyEightHoursAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getLastUnconsumedMacroPayload] Error:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  // Parse JSON fields
  return {
    ...data,
    items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items,
    totals: typeof data.totals === 'string' ? JSON.parse(data.totals) : data.totals,
  };
}

/**
 * Parses logging command and determines which items to log
 * Returns: { action: 'all' | 'specific' | 'adjusted', items: [], adjustments?: {} }
 */
export function parseLoggingCommand(
  userMessage: string,
  macroPayload: MacroPayload
): { action: string; items: any[]; adjustments?: Record<string, number> } {
  const lowerMsg = userMessage.toLowerCase().trim();

  // "log all" or "log it"
  if (/^(log\s*it|log\s*all|log\s*that|log\s*this)$/i.test(lowerMsg)) {
    return { action: 'all', items: macroPayload.items };
  }

  // "log ribeye with 4 eggs" - adjustment pattern
  const adjustMatch = lowerMsg.match(/log\s+(.+?)\s+with\s+(\d+)\s+(.+)/i);
  if (adjustMatch) {
    const item1Name = adjustMatch[1].trim();
    const newQty = parseInt(adjustMatch[2]);
    const item2Name = adjustMatch[3].trim();

    // Find items in payload
    const items = macroPayload.items.map(item => ({ ...item }));
    const item2 = findItemByName(items, item2Name);

    if (item2) {
      // Adjust quantity
      const adjusted = adjustItemQuantity(item2, newQty);
      const itemIndex = items.findIndex(i => i.name === item2.name);
      if (itemIndex >= 0) {
        items[itemIndex] = adjusted;
      }

      return {
        action: 'adjusted',
        items,
        adjustments: { [item2.name]: newQty }
      };
    }
  }

  // "log the ribeye" - specific item
  const specificMatch = lowerMsg.match(/log\s+(?:the\s+)?(.+?)(?:\s+only)?$/i);
  if (specificMatch) {
    const itemName = specificMatch[1].trim();
    const foundItem = findItemByName(macroPayload.items, itemName);

    if (foundItem) {
      return { action: 'specific', items: [foundItem] };
    }
  }

  // Default: log all
  return { action: 'all', items: macroPayload.items };
}

/**
 * Checks user's remaining daily calories
 * Returns: { remaining: number, overage: number }
 */
export async function checkCalorieBudget(
  userId: string,
  totalCalories: number
): Promise<{ remaining: number; overage: number; warn: boolean }> {
  const supabase = getSupabase();

  // Get user's daily calorie goal
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_calorie_goal')
    .eq('user_id', userId)
    .maybeSingle();

  const dailyGoal = profile?.daily_calorie_goal || 2000; // Default

  // Get today's logged calories
  const today = new Date().toISOString().split('T')[0];
  const { data: meals } = await supabase
    .from('meals')
    .select('energy_kcal')
    .eq('user_id', userId)
    .gte('eaten_at', `${today}T00:00:00`)
    .lt('eaten_at', `${today}T23:59:59`);

  const consumedToday = meals?.reduce((sum, m) => sum + (m.energy_kcal || 0), 0) || 0;
  const remaining = dailyGoal - consumedToday;
  const overage = totalCalories - remaining;

  return {
    remaining,
    overage: overage > 0 ? overage : 0,
    warn: overage > 0
  };
}

/**
 * Saves meal to meals from macro payload
 */
export async function saveMealFromMacros(
  userId: string,
  sessionId: string,
  items: any[],
  mealTime?: Date
): Promise<{ success: boolean; mealId?: string; error?: string }> {
  const supabase = getSupabase();

  const timestamp = mealTime || new Date();

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + (item.kcal || 0),
      protein_g: acc.protein_g + (item.protein_g || 0),
      carbs_g: acc.carbs_g + (item.carbs_g || 0),
      fat_g: acc.fat_g + (item.fat_g || 0),
      fiber_g: acc.fiber_g + (item.fiber_g || 0),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  );

  try {
    // Insert meal
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        session_id: sessionId,
        eaten_at: timestamp.toISOString(),
        name: 'macro-logged',
        meal_slot: 'unknown',
        source: 'text',
        totals: {
          kcal: Math.round(totals.kcal),
          protein_g: Math.round(totals.protein_g * 10) / 10,
          carbs_g: Math.round(totals.carbs_g * 10) / 10,
          fat_g: Math.round(totals.fat_g * 10) / 10,
        },
        micros_totals: {
          fiber_g: Math.round(totals.fiber_g * 10) / 10,
        },
        energy_kcal: Math.round(totals.kcal),
        protein_g: Math.round(totals.protein_g * 10) / 10,
        carbs_g: Math.round(totals.carbs_g * 10) / 10,
        fat_g: Math.round(totals.fat_g * 10) / 10,
        fiber_g: Math.round(totals.fiber_g * 10) / 10,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (mealError) {
      console.error('[saveMealFromMacros] Meal error:', mealError);
      return { success: false, error: mealError.message };
    }

    // Insert meal items
    const itemsToInsert = items.map((item, idx) => ({
      meal_log_id: meal.id,
      position: idx + 1,
      name: item.name,
      qty: item.qty || 1,
      unit: item.unit || 'serving',
      grams: item.grams_used || null,
      macros: {
        kcal: Math.round(item.kcal || 0),
        protein_g: Math.round((item.protein_g || 0) * 10) / 10,
        carbs_g: Math.round((item.carbs_g || 0) * 10) / 10,
        fat_g: Math.round((item.fat_g || 0) * 10) / 10,
      },
      micros: {
        fiber_g: Math.round((item.fiber_g || 0) * 10) / 10,
      },
      basis: item.basis_used || 'cooked',
    }));

    const { error: itemsError } = await supabase
      .from('meal_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('[saveMealFromMacros] Meal items error:', itemsError);
      return { success: false, error: itemsError.message };
    }

    return { success: true, mealId: meal.id };
  } catch (error: any) {
    console.error('[saveMealFromMacros] Exception:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Marks a macro payload as consumed
 */
export async function markMacroPayloadConsumed(
  messageId: string,
  userId: string
): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase.rpc('mark_macro_payload_consumed', {
    p_message_id: messageId,
    p_user_id: userId
  });

  if (error) {
    console.error('[markMacroPayloadConsumed] Error:', error);
    return false;
  }

  return true;
}
