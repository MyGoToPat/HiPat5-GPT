import { FoodResult } from './format';

export interface ValidationWarning {
  type: 'sum_mismatch' | 'calorie_formula_mismatch';
  message: string;
  expected: number;
  actual: number;
}

export function validateMacros(result: FoodResult): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const TOLERANCE = 0.10;

  const sumProtein = result.items.reduce((sum, item) => sum + item.macros.protein_g, 0);
  const sumFat = result.items.reduce((sum, item) => sum + item.macros.fat_g, 0);
  const sumCarbs = result.items.reduce((sum, item) => sum + item.macros.carbs_g, 0);

  if (Math.abs(sumProtein - result.totals.protein_g) > result.totals.protein_g * TOLERANCE) {
    warnings.push({
      type: 'sum_mismatch',
      message: `Protein sum mismatch (±10% tolerance)`,
      expected: result.totals.protein_g,
      actual: sumProtein
    });
  }

  if (Math.abs(sumFat - result.totals.fat_g) > result.totals.fat_g * TOLERANCE) {
    warnings.push({
      type: 'sum_mismatch',
      message: `Fat sum mismatch (±10% tolerance)`,
      expected: result.totals.fat_g,
      actual: sumFat
    });
  }

  if (Math.abs(sumCarbs - result.totals.carbs_g) > result.totals.carbs_g * TOLERANCE) {
    warnings.push({
      type: 'sum_mismatch',
      message: `Carbs sum mismatch (±10% tolerance)`,
      expected: result.totals.carbs_g,
      actual: sumCarbs
    });
  }

  const calculatedCalories = (sumProtein * 4) + (sumCarbs * 4) + (sumFat * 9);
  if (Math.abs(calculatedCalories - result.totals.kcal) > calculatedCalories * TOLERANCE) {
    warnings.push({
      type: 'calorie_formula_mismatch',
      message: `Calories don't match 4P+4C+9F formula (±10% tolerance)`,
      expected: Math.round(calculatedCalories),
      actual: result.totals.kcal
    });
  }

  return warnings;
}
