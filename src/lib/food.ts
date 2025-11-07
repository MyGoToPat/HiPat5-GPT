import { getSupabase } from './supabase';
import type { AnalysisResult } from '../types/food';
import type { FoodLogResponse } from '../types/foodlog';

/**
 * Process meal text through unified openai-chat function
 * Routes meal logging through the V1 meal logging system
 */
export async function processMealWithUnifiedChat(
  userMessage: string,
  userId: string
): Promise<FoodLogResponse> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [
          { role: 'user', content: userMessage }
        ],
        userId
      }
    });

    if (error) {
      console.error('[processMealWithUnifiedChat] Error:', error);
      return {
        ok: false,
        kind: 'food_log',
        step: 'open_verify',
        message: 'Failed to process meal',
        logged: false,
        needsClarification: false,
        analysisResult: {
          confidence: 0,
          items: [],
          totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        },
        error: error.message ?? 'Failed to process meal',
      };
    }

    // openai-chat returns {message, tool_calls, usage}
    // We need to transform this to FoodLogResponse
    console.log('[processMealWithUnifiedChat] Raw response:', data);

    // If the response has tool_calls, check what was executed
    if (data.tool_calls && Array.isArray(data.tool_calls)) {
      const hasLogMeal = data.tool_calls.some((tc: any) =>
        typeof tc === 'string' ? tc === 'log_meal' : tc.name === 'log_meal'
      );

      if (hasLogMeal) {
        // Meal was logged successfully - FORCE kind to food_log
        console.log('[processMealWithUnifiedChat] log_meal executed, returning kind: food_log, logged: true');
        return {
          ok: true,
          kind: 'food_log',
          step: 'complete',
          message: data.message || 'Meal logged successfully',
          logged: true,
          undo_token: data.undo_token, // Edge function should provide this
          needsClarification: false,
        };
      }

      // Tool was called but not log_meal (like get_macros for questions)
      return {
        ok: true,
        kind: 'food_question',
        step: 'complete',
        message: data.message,
        logged: false,
        needsClarification: false,
      };
    }

    // No tool calls - just a conversational response
    // Check if the message asks for confirmation
    const needsConfirmation = /would you like me to log/i.test(data.message);

    return {
      ok: true,
      kind: 'food_log',
      step: needsConfirmation ? 'confirm' : 'complete',
      message: data.message,
      logged: false,
      needsClarification: needsConfirmation,
    };

  } catch (err) {
    console.error('[processMealWithUnifiedChat] Exception:', err);
    return {
      ok: false,
      kind: 'food_log',
      step: 'open_verify',
      message: 'Failed to process meal',
      logged: false,
      needsClarification: false,
      analysisResult: {
        confidence: 0,
        items: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      },
      error: 'Failed to process meal',
    };
  }
}

/**
 * Save user's food terminology preference after clarification
 * This teaches Pat the user's personal food vocabulary
 */
export async function saveUserFoodPreference(
  userId: string,
  termUsed: string,
  resolvedTo: string
): Promise<void> {
  const supabase = getSupabase();

  try {
    await supabase
      .from('user_food_preferences')
      .upsert({
        user_id: userId,
        term_used: termUsed.toLowerCase().trim(),
        resolved_to: resolvedTo.toLowerCase().trim(),
        confirmed_at: new Date().toISOString(),
        use_count: 1,
        last_used: new Date().toISOString()
      }, {
        onConflict: 'user_id,term_used'
      });

    console.log('[Food Preference] Saved:', termUsed, '→', resolvedTo);
  } catch (error) {
    console.error('[Food Preference] Save error:', error);
  }
}

export async function fetchFoodMacros(
  foodName: string
): Promise<{ ok: boolean; macros?: any; error?: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('nutrition-resolver', {
    body: { foodName },
  });
  if (error) return { ok: false, error: error.message ?? 'Edge function failed' };

  // Handle different response formats
  let macros: any = undefined;
  if (data && typeof data === 'object') {
    // Check if data has macro properties directly
    if (typeof data.kcal === 'number') {
      macros = {
        calories: data.kcal, // Map kcal to calories for consistency
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        confidence: data.confidence
      };
    } else if (data.macros) {
      macros = data.macros;
    }
  }

  if (!macros) return { ok: false, error: 'No macro data in edge response' };
  return { ok: true, macros };
}

/**
 * Process meal text through unified openai-chat function
 * Routes meal logging through V1 meal logging system
 */
export async function processMealWithTMWYA(
  userMessage: string,
  userId: string,
  source: 'text' | 'voice' | 'photo' | 'barcode' = 'text'
): Promise<FoodLogResponse> {
  console.log('[TMWYA → Unified V1] Routing through openai-chat:', { userMessage, userId, source });

  // Route through V1 meal logging system
  return await processMealWithUnifiedChat(userMessage, userId);
}