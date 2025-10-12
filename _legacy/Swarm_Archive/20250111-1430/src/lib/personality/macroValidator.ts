/**
 * Macro Bullet Format Validator
 *
 * Ensures all macro responses follow the exact format:
 * • Calories: XXX kcal
 * • Protein: XX g
 * • Carbs: XX g
 * • Fat: XX g
 *
 * Log
 */

export interface MacroData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  macros?: MacroData;
}

/**
 * Validates if response follows strict bullet format
 */
export function validateMacroBulletFormat(response: string): ValidationResult {
  const errors: string[] = [];

  // Check for bullet character "•"
  if (!response.includes('•')) {
    errors.push('Missing bullet character "•"');
  }

  // Check for required labels
  const requiredLabels = ['Calories:', 'Protein:', 'Carbs:', 'Fat:'];
  for (const label of requiredLabels) {
    if (!response.includes(label)) {
      errors.push(`Missing label: ${label}`);
    }
  }

  // Check for "Log" at the end
  if (!response.trim().endsWith('Log')) {
    errors.push('Response must end with "Log"');
  }

  // Extract macros
  const macros = extractMacrosFromBullets(response);

  if (!macros) {
    errors.push('Could not extract valid macro values');
  }

  return {
    isValid: errors.length === 0,
    errors,
    macros: macros || undefined
  };
}

/**
 * Extracts macro values from bullet format
 */
export function extractMacrosFromBullets(response: string): MacroData | null {
  const caloriesMatch = response.match(/•\s*Calories:\s*(\d+(?:\.\d+)?)\s*kcal/i);
  const proteinMatch = response.match(/•\s*Protein:\s*(\d+(?:\.\d+)?)\s*g/i);
  const carbsMatch = response.match(/•\s*Carbs:\s*(\d+(?:\.\d+)?)\s*g/i);
  const fatMatch = response.match(/•\s*Fat:\s*(\d+(?:\.\d+)?)\s*g/i);

  if (!caloriesMatch || !proteinMatch || !carbsMatch || !fatMatch) {
    return null;
  }

  return {
    calories: parseFloat(caloriesMatch[1]),
    protein: parseFloat(proteinMatch[1]),
    carbs: parseFloat(carbsMatch[1]),
    fat: parseFloat(fatMatch[1])
  };
}

/**
 * Formats macro data into strict bullet format
 */
export function formatMacrosBullet(macros: MacroData): string {
  return `• Calories: ${macros.calories} kcal
• Protein: ${macros.protein} g
• Carbs: ${macros.carbs} g
• Fat: ${macros.fat} g

Log`;
}

/**
 * Detects if response contains macro data
 */
export function isMacroResponse(response: string): boolean {
  const macroKeywords = ['calories', 'protein', 'carbs', 'fat', 'kcal'];
  const lowerResponse = response.toLowerCase();

  let matchCount = 0;
  for (const keyword of macroKeywords) {
    if (lowerResponse.includes(keyword)) {
      matchCount++;
    }
  }

  // Must contain at least 3 macro keywords to be considered a macro response
  return matchCount >= 3;
}
