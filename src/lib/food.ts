import { getSupabase } from './supabase';

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