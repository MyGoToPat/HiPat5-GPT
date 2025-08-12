import { AnalysedFoodItem } from '../types/food';

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Calculate total macros from an array of food items
 * Single source of truth for macro calculations across the app
 */
export function getTotalMacros(items: AnalysedFoodItem[]): MacroTotals {
  return items.reduce(
    (total, item) => ({
      kcal: total.kcal + item.macros.kcal,
      protein: total.protein + item.macros.protein,
      carbs: total.carbs + item.macros.carbs,
      fat: total.fat + item.macros.fat
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}