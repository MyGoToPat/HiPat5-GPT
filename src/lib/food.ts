// Edge Food Macros caller
import { getSupabase } from './supabase';

export type Macros = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
};

export async function fetchFoodMacros(foodName: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('openai-food-macros', {
    body: { foodName },
  });
  if (error) throw error;
  if (!data) throw new Error('No data returned from food macros service');
  
  // Transform edge response to expected format
  const macros: Macros = {
    calories: data.kcal || 0,
    protein_g: data.protein_g || 0,
    carbs_g: data.carbs_g || 0,
    fat_g: data.fat_g || 0,
    confidence: 0.85 // Default confidence for OpenAI LLM results
  };
  
  return { ok: true, foodName, macros };
}