/**
 * OPENAI FUNCTION CALLING - TOOL DEFINITIONS & EXECUTOR
 */

import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

export const PAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "Log food items to the user's meal log. Use this when the user wants to record what they ate. You can extract food items from conversation history.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            description: "Array of food items to log",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the food item (e.g., 'chicken breast', 'rice', 'broccoli')"
                },
                quantity: {
                  type: "number",
                  description: "Amount of the food"
                },
                unit: {
                  type: "string",
                  description: "Unit of measurement (e.g., 'oz', 'g', 'cup', 'serving')"
                },
                macros: {
                  type: "object",
                  properties: {
                    kcal: { type: "number", description: "Calories" },
                    protein_g: { type: "number", description: "Protein in grams" },
                    fat_g: { type: "number", description: "Fat in grams" },
                    carbs_g: { type: "number", description: "Carbs in grams" },
                    fiber_g: { type: "number", description: "Fiber in grams" }
                  },
                  required: ["kcal", "protein_g", "fat_g", "carbs_g"]
                }
              },
              required: ["name", "quantity", "unit", "macros"]
            }
          },
          meal_slot: {
            type: "string",
            description: "When the meal was eaten",
            enum: ["breakfast", "lunch", "dinner", "snack"]
          },
          timestamp: {
            type: "string",
            description: "ISO timestamp of when the meal was eaten. If not specified, defaults to now."
          }
        },
        required: ["items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_remaining_macros",
      description: "Get the user's remaining macro targets for today (calories, protein, carbs, fat remaining)",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "undo_last_meal",
      description: "Delete the most recently logged meal. Use when user says 'undo', 'remove last meal', 'delete that', etc.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

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

async function logMealTool(args: any, userId: string, supabase: any) {
  const { items, meal_slot, timestamp } = args;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return { success: false, error: 'No items provided' };
  }

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

  const { data: mealLogId, error } = await supabase.rpc('log_meal', {
    p_ts: timestamp || new Date().toISOString(),
    p_meal_slot_text: meal_slot || null,
    p_note: null,
    p_items: itemsForDb
  });

  if (error) {
    console.error('[logMealTool] RPC error:', error);
    return {
      success: false,
      error: error.message,
      result: {
        kind: 'food_log',
        logged: false,
        errors: [error.message]
      }
    };
  }

  const totals = items.reduce((acc: any, item: any) => ({
    kcal: acc.kcal + (item.macros.kcal || 0),
    protein_g: acc.protein_g + (item.macros.protein_g || 0),
    fat_g: acc.fat_g + (item.macros.fat_g || 0),
    carbs_g: acc.carbs_g + (item.macros.carbs_g || 0),
    fiber_g: acc.fiber_g + (item.macros.fiber_g || 0)
  }), { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 });

  console.log(`[logMealTool] Success: logged meal_id=${mealLogId}, items=${items.length}, kcal=${totals.kcal}`);

  return {
    success: true,
    result: {
      kind: 'food_log',
      logged: true,
      meal_log_id: mealLogId,
      items_logged: items.length,
      totals
    }
  };
}

async function getRemainingMacrosTool(userId: string, supabase: any) {
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

async function undoLastMealTool(userId: string, supabase: any) {
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
