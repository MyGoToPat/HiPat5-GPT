import { getSupabase } from './supabase';

export async function setMacroOverrides(proteinG: number, fatG: number, carbG: number) {
  const { error } = await getSupabase().rpc('set_macro_overrides', {
    p_protein: proteinG,
    p_fat: fatG,
    p_carb: carbG,
  });
  if (error) throw error;
}

/**
 * Calculate target calories based on user metrics
 * Handles bidirectional calculation:
 * - If manual_macro_override: Calculate calories FROM macros
 * - Otherwise: Use TDEE-based calculation
 */
export function calculateTargetCalories(metrics: {
  tdee?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  manual_macro_override?: boolean;
  caloric_goal?: 'deficit' | 'maintenance' | 'surplus';
  caloric_adjustment?: number;
}): number {
  if (!metrics) return 0;

  // If user manually set macros, calculate target FROM macros
  if (metrics.manual_macro_override && metrics.protein_g && metrics.carbs_g && metrics.fat_g) {
    const macroCalories = (metrics.protein_g * 4) + (metrics.carbs_g * 4) + (metrics.fat_g * 9);
    return Math.round(macroCalories);
  }

  // Otherwise, use traditional TDEE-based calculation
  const tdee = metrics.tdee || 0;
  const goal = metrics.caloric_goal || 'maintenance';
  const adjustment = metrics.caloric_adjustment || 500;

  switch (goal) {
    case 'deficit':
      return tdee - adjustment;
    case 'surplus':
      return tdee + adjustment;
    default:
      return tdee;
  }
}

/**
 * Calculate net calories after TEF (Thermic Effect of Food)
 */
export function calculateNetCalories(
  targetCalories: number,
  protein_g?: number,
  carbs_g?: number,
  fat_g?: number
): number {
  if (!protein_g || !carbs_g || !fat_g) return targetCalories;

  const proteinTEF = (protein_g * 4) * 0.30;
  const carbsTEF = (carbs_g * 4) * 0.12;
  const fatTEF = (fat_g * 9) * 0.02;
  const tef = Math.round(proteinTEF + carbsTEF + fatTEF);

  return Math.round(targetCalories - tef);
}