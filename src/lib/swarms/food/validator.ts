/**
 * Confidence Validator Agent
 *
 * Pure function - validates data quality and flags issues.
 * NO LLM calls, NO database access. Just validation logic.
 */

import type { MacroSummary } from '../../cache/questionCache';

export interface ValidationResult {
  valid: boolean;
  confidence: number;
  warnings: string[];
  needsClarification: boolean;
}

/**
 * Validate macro data quality
 */
export function validateMacroData(summary: MacroSummary): ValidationResult {
  const warnings: string[] = [];
  let confidence = 1.0;

  // Check for low-confidence items
  const lowConfidenceItems = summary.items.filter(i =>
    i.metadata?.confidence !== undefined && i.metadata.confidence < 0.7
  );

  if (lowConfidenceItems.length > 0) {
    warnings.push(`Uncertain about: ${lowConfidenceItems.map(i => i.name).join(', ')}`);
    confidence *= 0.8;
  }

  // Check for unusually high calories per item (potential error)
  const avgCalPerItem = summary.items.length > 0
    ? summary.totals.kcal / summary.items.length
    : 0;

  if (avgCalPerItem > 1000) {
    warnings.push('Some items have unusually high calories - please verify quantities');
    confidence *= 0.9;
  }

  // Check macro ratio sanity (P+C+F should roughly match calories)
  const calculatedCal =
    summary.totals.protein_g * 4 +
    summary.totals.carbs_g * 4 +
    summary.totals.fat_g * 9;

  const ratio = summary.totals.kcal > 0 ? calculatedCal / summary.totals.kcal : 1;

  if (ratio < 0.8 || ratio > 1.2) {
    warnings.push('Macro totals don\'t match calorie total (data inconsistency detected)');
    confidence *= 0.7;
  }

  // Check for zero or negative values
  if (summary.totals.kcal <= 0) {
    warnings.push('No calories calculated - check food items');
    confidence = 0;
  }

  if (summary.totals.protein_g < 0 || summary.totals.fat_g < 0 || summary.totals.carbs_g < 0) {
    warnings.push('Negative macro values detected - invalid data');
    confidence = 0;
  }

  // Check for unrealistic macro ratios
  const totalMacros = summary.totals.protein_g + summary.totals.fat_g + summary.totals.carbs_g;
  if (totalMacros <= 0) {
    warnings.push('All macros are zero - no nutrition data found');
    confidence = 0;
  }

  // Check if fiber exceeds carbs (physically impossible)
  if (summary.totals.fiber_g > summary.totals.carbs_g) {
    warnings.push('Fiber exceeds total carbs (data error)');
    confidence *= 0.5;
  }

  return {
    valid: confidence > 0.5,
    confidence,
    warnings,
    needsClarification: confidence < 0.7
  };
}

/**
 * Validate single item data quality
 */
export function validateItem(item: {
  name: string;
  quantity: number;
  unit: string;
  macros: {
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
  };
}): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for empty name
  if (!item.name || item.name.trim().length === 0) {
    issues.push('Empty food name');
  }

  // Check for invalid quantity
  if (item.quantity <= 0) {
    issues.push('Invalid quantity (must be > 0)');
  }

  // Check for empty unit
  if (!item.unit || item.unit.trim().length === 0) {
    issues.push('Missing unit');
  }

  // Check for negative macros
  if (item.macros.kcal < 0) issues.push('Negative calories');
  if (item.macros.protein_g < 0) issues.push('Negative protein');
  if (item.macros.fat_g < 0) issues.push('Negative fat');
  if (item.macros.carbs_g < 0) issues.push('Negative carbs');
  if (item.macros.fiber_g < 0) issues.push('Negative fiber');

  // Check 4/4/9 rule
  const calculatedKcal =
    item.macros.protein_g * 4 +
    item.macros.carbs_g * 4 +
    item.macros.fat_g * 9;

  const ratio = item.macros.kcal > 0 ? calculatedKcal / item.macros.kcal : 1;

  if (ratio < 0.7 || ratio > 1.3) {
    issues.push('Calories don\'t match macros (4/4/9 rule violated)');
  }

  // Check fiber vs carbs
  if (item.macros.fiber_g > item.macros.carbs_g) {
    issues.push('Fiber exceeds carbs (impossible)');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
