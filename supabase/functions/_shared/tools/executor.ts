/**
 * TOOL EXECUTOR
 *
 * Executes tool calls made by the LLM.
 * Each tool function receives arguments from OpenAI and performs the actual action.
 */

import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

interface ToolExecutionContext {
  userId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export async function executeTool(
  toolName: string,
  toolArgs: any,
  context: ToolExecutionContext
): Promise<{ success: boolean; result?: any; error?: string }> {
  console.log(`[executeTool] Executing: ${toolName}`, toolArgs);

  const supabase = createClient(context.supabaseUrl, context.supabaseKey);

  try {
    switch (toolName) {
      case 'log_meal':
        return await logMealTool(toolArgs, context.userId, supabase);

      case 'get_macros':
        return await getMacrosTool(toolArgs);

      case 'get_remaining_macros':
        return await getRemainingMacrosTool(context.userId, supabase);

      case 'undo_last_meal':
        return await undoLastMealTool(context.userId, supabase);

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        };
    }
  } catch (error) {
    console.error(`[executeTool] Error executing ${toolName}:`, error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * LOG MEAL TOOL
 * Logs food items to database using log_meal RPC
 */
async function logMealTool(args: any, userId: string, supabase: any) {
  const { items, meal_slot, timestamp } = args;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'No items provided' };
  }

  // Prepare items for log_meal RPC
  const itemsForDb = items.map((item: any, index: number) => ({
    position: index + 1,
    name: item.name,
    quantity: String(item.quantity || 1),
    unit: item.unit || 'serving',
    energy_kcal: String(item.macros.kcal || 0),
    protein_g: String(item.macros.protein_g || 0),
    fat_g: String(item.macros.fat_g || 0),
    carbs_g: String(item.macros.carbs_g || 0),
    fiber_g: String(item.macros.fiber_g || 0)
  }));

  // Call log_meal RPC
  const { data: mealLogId, error } = await supabase.rpc('log_meal', {
    p_ts: timestamp || new Date().toISOString(),
    p_meal_slot_text: meal_slot || null,
    p_note: null,
    p_items: itemsForDb
  });

  if (error) {
    console.error('[logMealTool] RPC error:', error);
    return { success: false, error: error.message };
  }

  // Calculate totals for response
  const totals = items.reduce((acc: any, item: any) => ({
    kcal: acc.kcal + (item.macros.kcal || 0),
    protein_g: acc.protein_g + (item.macros.protein_g || 0),
    fat_g: acc.fat_g + (item.macros.fat_g || 0),
    carbs_g: acc.carbs_g + (item.macros.carbs_g || 0),
    fiber_g: acc.fiber_g + (item.macros.fiber_g || 0)
  }), { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 });

  return {
    success: true,
    result: {
      meal_log_id: mealLogId,
      items_logged: items.length,
      totals
    }
  };
}

/**
 * GET MACROS TOOL
 * Calculates macros for food WITHOUT logging (uses USDA/common values)
 */
async function getMacrosTool(args: any) {
  const { food_description } = args;

  // This is a simplified implementation
  // In production, you'd call a nutrition API or database
  // For now, return a message that Pat should use its knowledge
  return {
    success: true,
    result: {
      message: "Use your nutritional knowledge to provide macro estimates based on USDA values.",
      food_description
    }
  };
}

/**
 * GET REMAINING MACROS TOOL
 * Gets user's remaining macros for today
 */
async function getRemainingMacrosTool(userId: string, supabase: any) {
  // Get user's macro targets
  const { data: userMetrics, error: metricsError } = await supabase
    .from('user_metrics')
    .select('calorie_target, protein_g_target, carbs_g_target, fat_g_target, fiber_g_target')
    .eq('user_id', userId)
    .maybeSingle();

  if (metricsError) {
    return { success: false, error: metricsError.message };
  }

  if (!userMetrics) {
    return {
      success: false,
      error: 'User has not completed TDEE onboarding'
    };
  }

  // Get today's consumed macros
  const today = new Date().toISOString().split('T')[0];
  const { data: todayRollup, error: rollupError } = await supabase
    .from('day_rollups')
    .select('total_kcal, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g')
    .eq('user_id', userId)
    .eq('day_date', today)
    .maybeSingle();

  if (rollupError) {
    return { success: false, error: rollupError.message };
  }

  const consumed = todayRollup || {
    total_kcal: 0,
    total_protein_g: 0,
    total_carbs_g: 0,
    total_fat_g: 0,
    total_fiber_g: 0
  };

  return {
    success: true,
    result: {
      targets: {
        kcal: userMetrics.calorie_target,
        protein_g: userMetrics.protein_g_target,
        carbs_g: userMetrics.carbs_g_target,
        fat_g: userMetrics.fat_g_target,
        fiber_g: userMetrics.fiber_g_target
      },
      consumed: {
        kcal: consumed.total_kcal,
        protein_g: consumed.total_protein_g,
        carbs_g: consumed.total_carbs_g,
        fat_g: consumed.total_fat_g,
        fiber_g: consumed.total_fiber_g
      },
      remaining: {
        kcal: userMetrics.calorie_target - consumed.total_kcal,
        protein_g: userMetrics.protein_g_target - consumed.total_protein_g,
        carbs_g: userMetrics.carbs_g_target - consumed.total_carbs_g,
        fat_g: userMetrics.fat_g_target - consumed.total_fat_g,
        fiber_g: userMetrics.fiber_g_target - consumed.total_fiber_g
      }
    }
  };
}

/**
 * UNDO LAST MEAL TOOL
 * Deletes the most recent meal log
 */
async function undoLastMealTool(userId: string, supabase: any) {
  // Get most recent meal
  const { data: lastMeal, error: fetchError } = await supabase
    .from('meal_logs')
    .select('id, ts')
    .eq('user_id', userId)
    .order('ts', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  if (!lastMeal) {
    return { success: false, error: 'No meals to undo' };
  }

  // Delete the meal (cascade will delete items)
  const { error: deleteError } = await supabase
    .from('meal_logs')
    .delete()
    .eq('id', lastMeal.id);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  return {
    success: true,
    result: {
      deleted_meal_id: lastMeal.id,
      deleted_at: lastMeal.ts
    }
  };
}
