/**
 * Macro Validator
 *
 * Validates macro calculations against USDA data with tolerance checks
 */

import type { USDAMacros } from './formatter';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: keyof USDAMacros;
  message: string;
  expected?: number;
  actual: number;
  tolerance?: number;
}

export interface ValidationWarning {
  field: keyof USDAMacros;
  message: string;
  actual: number;
}

const TOLERANCE = {
  kcal: 5,        // ±5 kcal
  protein_g: 0.5, // ±0.5g
  carbs_g: 0.5,   // ±0.5g
  fat_g: 0.5,     // ±0.5g
  fiber_g: 0.5    // ±0.5g
};

/**
 * Validate macros against USDA baseline
 */
export function validateMacros(
  actual: USDAMacros,
  expected: USDAMacros,
  strictMode = false
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check kcal
  const kcalDiff = Math.abs(actual.kcal - expected.kcal);
  if (kcalDiff > TOLERANCE.kcal) {
    errors.push({
      field: 'kcal',
      message: `Calories off by ${kcalDiff.toFixed(0)} kcal`,
      expected: expected.kcal,
      actual: actual.kcal,
      tolerance: TOLERANCE.kcal
    });
  }

  // Check protein
  const proteinDiff = Math.abs(actual.protein_g - expected.protein_g);
  if (proteinDiff > TOLERANCE.protein_g) {
    errors.push({
      field: 'protein_g',
      message: `Protein off by ${proteinDiff.toFixed(1)}g`,
      expected: expected.protein_g,
      actual: actual.protein_g,
      tolerance: TOLERANCE.protein_g
    });
  }

  // Check carbs
  const carbsDiff = Math.abs(actual.carbs_g - expected.carbs_g);
  if (carbsDiff > TOLERANCE.carbs_g) {
    errors.push({
      field: 'carbs_g',
      message: `Carbs off by ${carbsDiff.toFixed(1)}g`,
      expected: expected.carbs_g,
      actual: actual.carbs_g,
      tolerance: TOLERANCE.carbs_g
    });
  }

  // Check fat
  const fatDiff = Math.abs(actual.fat_g - expected.fat_g);
  if (fatDiff > TOLERANCE.fat_g) {
    errors.push({
      field: 'fat_g',
      message: `Fat off by ${fatDiff.toFixed(1)}g`,
      expected: expected.fat_g,
      actual: actual.fat_g,
      tolerance: TOLERANCE.fat_g
    });
  }

  // Check fiber (optional)
  if (expected.fiber_g !== undefined && actual.fiber_g !== undefined) {
    const fiberDiff = Math.abs(actual.fiber_g - expected.fiber_g);
    if (fiberDiff > TOLERANCE.fiber_g) {
      if (strictMode) {
        errors.push({
          field: 'fiber_g',
          message: `Fiber off by ${fiberDiff.toFixed(1)}g`,
          expected: expected.fiber_g,
          actual: actual.fiber_g,
          tolerance: TOLERANCE.fiber_g
        });
      } else {
        warnings.push({
          field: 'fiber_g',
          message: `Fiber slightly off: ${actual.fiber_g}g vs ${expected.fiber_g}g`,
          actual: actual.fiber_g
        });
      }
    }
  }

  // Validate kcal matches macro calculation
  const calculatedKcal = Math.round(
    actual.protein_g * 4 + actual.carbs_g * 4 + actual.fat_g * 9
  );
  const kcalMismatch = Math.abs(actual.kcal - calculatedKcal);
  if (kcalMismatch > 10) {
    warnings.push({
      field: 'kcal',
      message: `Calories don't match macros: ${actual.kcal} kcal stated, ${calculatedKcal} kcal calculated`,
      actual: actual.kcal
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate macro ratios are reasonable
 */
export function validateMacroRatios(macros: USDAMacros): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const proteinKcal = macros.protein_g * 4;
  const carbsKcal = macros.carbs_g * 4;
  const fatKcal = macros.fat_g * 9;
  const total = proteinKcal + carbsKcal + fatKcal;

  if (total === 0) {
    errors.push({
      field: 'kcal',
      message: 'Total calories is zero',
      actual: 0
    });
    return { valid: false, errors, warnings };
  }

  const proteinPct = (proteinKcal / total) * 100;
  const carbsPct = (carbsKcal / total) * 100;
  const fatPct = (fatKcal / total) * 100;

  // Protein should be 0-100%
  if (proteinPct > 100) {
    warnings.push({
      field: 'protein_g',
      message: `Protein is ${proteinPct.toFixed(0)}% of calories (unusual)`,
      actual: macros.protein_g
    });
  }

  // Carbs should be 0-100%
  if (carbsPct > 100) {
    warnings.push({
      field: 'carbs_g',
      message: `Carbs are ${carbsPct.toFixed(0)}% of calories (unusual)`,
      actual: macros.carbs_g
    });
  }

  // Fat should be 0-100%
  if (fatPct > 100) {
    warnings.push({
      field: 'fat_g',
      message: `Fat is ${fatPct.toFixed(0)}% of calories (unusual)`,
      actual: macros.fat_g
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if macros are within acceptable ranges
 */
export function isWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number
): boolean {
  return Math.abs(actual - expected) <= tolerance;
}
