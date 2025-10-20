import type { V1FoodItem, MacroTotals, AutosaveGates } from '../../../src/types/foodlog.ts';

export interface ConfidenceScore {
  overall: number;
  factors: {
    llm: number;
    completeness: number;
    macroValidity: number;
    calorieRange: number;
  };
  gates: AutosaveGates;
}

/**
 * Evaluate confidence and autosave gates for a parsed meal
 * @param items - Parsed food items from LLM
 * @param totals - Aggregated macro totals
 * @param llmConfidence - Confidence score from LLM (0-1)
 * @returns Confidence score and gate results
 */
export function evaluateConfidence(
  items: V1FoodItem[],
  totals: MacroTotals,
  llmConfidence: number
): ConfidenceScore {
  // Factor 1: LLM confidence (weight: 40%)
  const llmFactor = llmConfidence;

  // Factor 2: Data completeness (weight: 30%)
  const completenessFactor = calculateCompleteness(items);

  // Factor 3: Macro validity (weight: 20%)
  const macroValidityFactor = validateMacros(items, totals);

  // Factor 4: Calorie range sanity (weight: 10%)
  const calorieRangeFactor = validateCalorieRange(totals.calories);

  // Calculate weighted overall confidence
  const overall =
    llmFactor * 0.4 +
    completenessFactor * 0.3 +
    macroValidityFactor * 0.2 +
    calorieRangeFactor * 0.1;

  // Evaluate autosave gates
  const gates: AutosaveGates = {
    confidence: overall >= 0.9,
    hasItems: items.length >= 1,
    hasCompleteData: completenessFactor >= 0.9,
    validCalories: totals.calories >= 50 && totals.calories <= 1500,
  };

  return {
    overall,
    factors: {
      llm: llmFactor,
      completeness: completenessFactor,
      macroValidity: macroValidityFactor,
      calorieRange: calorieRangeFactor,
    },
    gates,
  };
}

/**
 * Check if all autosave gates pass
 */
export function canAutosave(gates: AutosaveGates): boolean {
  return gates.confidence && gates.hasItems && gates.hasCompleteData && gates.validCalories;
}

/**
 * Calculate data completeness factor (0-1)
 * Checks if all required fields are present and valid
 */
function calculateCompleteness(items: V1FoodItem[]): number {
  if (items.length === 0) return 0;

  let totalScore = 0;

  for (const item of items) {
    let itemScore = 0;

    // Required fields (each worth 0.25)
    if (item.name && item.name.trim().length > 0) itemScore += 0.25;
    if (item.quantity && item.quantity > 0) itemScore += 0.25;
    if (item.unit && item.unit.trim().length > 0) itemScore += 0.25;

    // Macros present and valid (worth 0.25)
    if (item.macros &&
        typeof item.macros.calories === 'number' &&
        typeof item.macros.protein === 'number' &&
        typeof item.macros.carbs === 'number' &&
        typeof item.macros.fat === 'number') {
      itemScore += 0.25;
    }

    totalScore += itemScore;
  }

  return totalScore / items.length;
}

/**
 * Validate macro ratios and totals (0-1)
 * Checks if macros are within reasonable ranges
 */
function validateMacros(items: V1FoodItem[], totals: MacroTotals): number {
  if (items.length === 0 || !totals) return 0;

  let score = 1.0;

  // Check if totals match sum of items
  let sumCalories = 0;
  let sumProtein = 0;
  let sumCarbs = 0;
  let sumFat = 0;

  for (const item of items) {
    if (item.macros) {
      sumCalories += item.macros.calories || 0;
      sumProtein += item.macros.protein || 0;
      sumCarbs += item.macros.carbs || 0;
      sumFat += item.macros.fat || 0;
    }
  }

  // Allow 5% variance in totals
  const calorieVariance = Math.abs(sumCalories - totals.calories) / totals.calories;
  if (calorieVariance > 0.05) score -= 0.3;

  // Check macro ratios (4 cal/g protein and carbs, 9 cal/g fat)
  const calculatedCalories = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
  const ratioVariance = Math.abs(calculatedCalories - totals.calories) / totals.calories;
  if (ratioVariance > 0.1) score -= 0.3;

  // Check if any macro is negative
  if (totals.calories < 0 || totals.protein < 0 || totals.carbs < 0 || totals.fat < 0) {
    score -= 0.4;
  }

  return Math.max(0, score);
}

/**
 * Validate calorie range is reasonable (0-1)
 * Meals typically between 50-1500 calories
 */
function validateCalorieRange(calories: number): number {
  if (calories < 50) return 0;
  if (calories > 1500) return Math.max(0, 1 - (calories - 1500) / 1000);
  if (calories < 100) return calories / 100; // Gradual ramp from 50-100
  return 1.0;
}

/**
 * Identify missing high-impact fields for clarification
 */
export function identifyMissingFields(items: V1FoodItem[]): string[] {
  const missing: string[] = [];

  for (const item of items) {
    if (!item.name || item.name.trim().length === 0) {
      missing.push('food_name');
    }
    if (!item.quantity || item.quantity <= 0) {
      missing.push('quantity');
    }
    if (!item.unit || item.unit.trim().length === 0) {
      missing.push('unit');
    }
    if (!item.macros ||
        typeof item.macros.calories !== 'number' ||
        typeof item.macros.protein !== 'number' ||
        typeof item.macros.carbs !== 'number' ||
        typeof item.macros.fat !== 'number') {
      // Check if brand is present - if not, we need either brand or label macros
      if (!item.brand || item.brand.trim().length === 0) {
        missing.push('brand_or_macros');
      } else {
        missing.push('macros');
      }
    }
  }

  return [...new Set(missing)]; // Remove duplicates
}
