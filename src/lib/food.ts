import { getSupabase } from './supabase';
import type { AnalysisResult } from '../types/food';

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
 * Process meal text using TMWYA agents through personality orchestrator
 * This integrates with Pat's personality system for consistent UX
 */
export async function processMealWithTMWYA(
  userMessage: string,
  userId: string,
  source: 'text' | 'voice' | 'photo' | 'barcode' = 'text'
): Promise<{
  ok: boolean;
  analysisResult?: AnalysisResult;
  error?: string;
  step?: string;
}> {
  const supabase = getSupabase();

  try {
    console.log('[TMWYA Client] Invoking edge function:', { userMessage, userId, source });

    const { data, error } = await supabase.functions.invoke('tmwya-process-meal', {
      body: { userMessage, userId, source },
    });

    console.log('[TMWYA Client] Edge function response:', { data, error });

    if (error) {
      console.error('[TMWYA Client] Edge function error:', error);
      return { ok: false, error: error.message || 'Failed to process meal', step: 'edge_function' };
    }

    if (!data || !data.ok) {
      console.error('[TMWYA Client] Invalid response:', data);
      return { ok: false, error: data?.error || 'Unknown error', step: data?.step || 'unknown' };
    }

    // Transform response to AnalysisResult format
    const analysisResult: AnalysisResult = {
      source,
      meal_slot: data.meal_slot || 'unknown',
      items: data.items.map((item: any) => ({
        name: item.name,
        originalText: item.originalText,
        grams: item.grams,
        macros: item.macros,
        confidence: item.confidence,
        candidates: [{
          name: item.name,
          macros: item.macros,
          confidence: item.confidence
        }]
      })),
      originalInput: userMessage
    };

    return { ok: true, analysisResult };
  } catch (error: any) {
    console.error('[TMWYA] Client error:', error);
    return { ok: false, error: error.message || 'Unknown error', step: 'client' };
  }
}