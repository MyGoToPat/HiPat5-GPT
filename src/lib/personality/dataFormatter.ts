/**
 * Deterministic Data Formatter
 *
 * NO LLM calls - pure template formatting.
 * Formats structured responses with assumption banners.
 */

import type { MacroSummary } from '../cache/questionCache';
import type { ValidationResult } from '../swarms/food/validator';
import type { RemainingKPIs } from '../swarms/kpi/remainingSwarm';
import type { UndoResult } from '../swarms/food/undoSwarm';

export type FormattedType =
  | 'food_question'
  | 'food_logged'
  | 'kpi_answer'
  | 'undo_confirmation'
  | 'general';

export interface FormattedResponse {
  type: FormattedType;
  text: string;
  metadata?: {
    summary?: MacroSummary;
    validation?: ValidationResult;
    canLog?: boolean;
    hasAssumptions?: boolean;
    skipLLM?: boolean;
  };
}

/**
 * Format food question response
 */
export function formatFoodQuestion(
  summary: MacroSummary,
  validation: ValidationResult
): FormattedResponse {
  // Format individual items
  const bullets = summary.items.map(item => {
    const macroLine = `${Math.round(item.macros.protein_g)}P / ${Math.round(item.macros.fat_g)}F / ${Math.round(item.macros.carbs_g)}C`;
    const fiberLine = item.macros.fiber_g > 0 ? ` / ${Math.round(item.macros.fiber_g)}Fi` : '';

    return `• ${item.name} (${item.quantity}${item.unit}): ${Math.round(item.macros.kcal)} kcal\n  ${macroLine}${fiberLine}`;
  }).join('\n\n');

  // Format totals
  const total = `\n\n**Total:**\n` +
    `• Calories: ${Math.round(summary.totals.kcal)} kcal\n` +
    `• Protein: ${Math.round(summary.totals.protein_g)}g\n` +
    `• Fat: ${Math.round(summary.totals.fat_g)}g\n` +
    `• Carbs: ${Math.round(summary.totals.carbs_g)}g` +
    (summary.totals.fiber_g > 0 ? `\n• Fiber: ${Math.round(summary.totals.fiber_g)}g` : '');

  // Collect assumptions
  const assumptions: string[] = [];
  summary.items.forEach(item => {
    if (item.metadata?.prepState === 'cooked' && !item.metadata?.explicitPrep) {
      assumptions.push(`${item.name} assumed cooked`);
    }
    if (item.metadata?.sizeAssumed) {
      assumptions.push(`${item.name} assumed ${item.metadata.sizeAssumed}`);
    }
  });

  let banner = '';
  if (assumptions.length > 0) {
    banner = `\n\n💡 *Assumptions:* ${assumptions.join('; ')}`;
    if (summary.items.length > 0) {
      const firstItem = summary.items[0].name;
      banner += `\n_Say "use raw ${firstItem}" or "make it large" to adjust._`;
    }
  }

  // Warnings
  const warnings = validation.warnings.length > 0
    ? `\n\n⚠️ ${validation.warnings.join(', ')}`
    : '';

  // CTA
  const cta = `\n\nSay "log" to save this meal.`;

  return {
    type: 'food_question',
    text: bullets + total + banner + warnings + cta,
    metadata: {
      summary,
      validation,
      canLog: true,
      hasAssumptions: assumptions.length > 0,
      skipLLM: true
    }
  };
}

/**
 * Format food logged confirmation
 */
export function formatFoodLogged(
  summary: MacroSummary,
  isDuplicate: boolean = false
): FormattedResponse {
  const duplicateNote = isDuplicate ? '_(duplicate detected, not logged again)_\n\n' : '';

  const bullets = summary.items.map(item =>
    `• ${item.name} (${item.quantity}${item.unit}): ${Math.round(item.macros.kcal)} kcal`
  ).join('\n');

  const total = `\n\n**Logged:** ${Math.round(summary.totals.kcal)} kcal | ` +
    `${Math.round(summary.totals.protein_g)}P / ` +
    `${Math.round(summary.totals.fat_g)}F / ` +
    `${Math.round(summary.totals.carbs_g)}C`;

  return {
    type: 'food_logged',
    text: duplicateNote + bullets + total + `\n\n✓ Meal logged successfully.`,
    metadata: {
      summary,
      skipLLM: true
    }
  };
}

/**
 * Format KPI answer
 */
export function formatKPIAnswer(remaining: RemainingKPIs): FormattedResponse {
  const kcalText = remaining.kcal >= 0
    ? `${Math.round(remaining.kcal)} kcal remaining`
    : `${Math.round(Math.abs(remaining.kcal))} kcal over`;

  const proteinText = remaining.protein_g >= 0
    ? `${Math.round(remaining.protein_g)}g protein remaining`
    : `${Math.round(Math.abs(remaining.protein_g))}g protein over`;

  const text = `**Today's Remaining Macros:**\n\n` +
    `• ${kcalText} (${Math.round(remaining.percentage_used)}% used)\n` +
    `• ${proteinText}\n` +
    `• ${Math.round(Math.abs(remaining.fat_g))}g fat ${remaining.fat_g >= 0 ? 'remaining' : 'over'}\n` +
    `• ${Math.round(Math.abs(remaining.carbs_g))}g carbs ${remaining.carbs_g >= 0 ? 'remaining' : 'over'}` +
    (remaining.fiber_g > 0 ? `\n• ${Math.round(remaining.fiber_g)}g fiber remaining` : '');

  return {
    type: 'kpi_answer',
    text,
    metadata: {
      skipLLM: true
    }
  };
}

/**
 * Format undo confirmation
 */
export function formatUndoConfirmation(result: UndoResult): FormattedResponse {
  const text = result.success
    ? `✓ Last meal undone (${result.mealSlot || 'meal'} at ${new Date(result.timestamp!).toLocaleTimeString()}).`
    : `❌ ${result.error}`;

  return {
    type: 'undo_confirmation',
    text,
    metadata: {
      skipLLM: true
    }
  };
}

/**
 * Format general response (fallback)
 */
export function formatGeneral(text: string): FormattedResponse {
  return {
    type: 'general',
    text,
    metadata: {
      skipLLM: false // General responses can use LLM
    }
  };
}
