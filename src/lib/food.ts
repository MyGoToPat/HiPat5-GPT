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

    // Return the structured FoodLogResponse from edge function
    return data as FoodLogResponse;
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
  const { data, error } = await supabase.functions.invoke('openai-food-macros', {
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