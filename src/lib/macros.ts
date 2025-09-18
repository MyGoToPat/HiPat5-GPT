import { getSupabase } from './supabase';

export async function setMacroOverrides(proteinG: number, fatG: number, carbG: number) {
  const { error } = await getSupabase().rpc('set_macro_overrides', {
    p_protein: proteinG,
    p_fat: fatG,
    p_carb: carbG,
  });
  if (error) throw error;
}