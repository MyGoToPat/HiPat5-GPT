import { getSupabase } from './supabase';

export type MacroResult = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
};

export async function fetchFoodMacros(
  foodName: string
): Promise<{ ok: boolean; macros?: MacroResult; error?: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('openai-food-macros', {
    body: { foodName },
  });
  if (error) return { ok: false, error: error.message ?? 'Edge function failed' };

  const src: any = data?.macros ?? data;
  if (!src) return { ok: false, error: 'No macros in edge response' };

  const calories = src.calories ?? src.kcal;
  const macros: MacroResult = {
    calories: Number(calories ?? 0),
    protein_g: Number(src.protein_g ?? src.protein ?? 0),
    carbs_g: Number(src.carbs_g ?? src.carbs ?? 0),
    fat_g: Number(src.fat_g ?? src.fat ?? 0),
    confidence: Number(src.confidence ?? 0.85),
  };

  return { ok: true, macros };
}