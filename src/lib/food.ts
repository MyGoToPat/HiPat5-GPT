// Edge Food Macros caller
import { getSupabase } from './supabase';

export type Macros = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export async function fetchFoodMacros(foodName: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('openai-food-macros', {
    body: { foodName },
  });
  if (error) throw error;
  return data; // pass-through edge response
}