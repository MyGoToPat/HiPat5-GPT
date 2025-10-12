/**
 * Macro Aggregator Agent
 *
 * Pure function - sums nutrition data with full precision.
 * NO LLM calls, NO database access. Just math.
 */

import type { MacroSummary } from '../../cache/questionCache';

export interface NutritionData {
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
  source: 'cache' | 'usda' | 'llm_estimate';
  confidence: number;
  metadata?: {
    prepState?: 'cooked' | 'raw' | 'mixed';
    explicitPrep?: boolean;
    sizeAssumed?: string;
    unitConverted?: boolean;
    targetUnit?: string;
  };
}

export interface ReconciliationResult {
  original: MacroSummary['totals'];
  reconciled: MacroSummary['totals'];
  adjustmentMade: boolean;
  reason?: string;
}

/**
 * Aggregate nutrition data (pure function)
 */
export function aggregateMacros(items: NutritionData[]): MacroSummary {
  // Sum with full precision (no rounding)
  const totals = items.reduce((acc, item) => ({
    kcal: acc.kcal + item.macros.kcal,
    protein_g: acc.protein_g + item.macros.protein_g,
    fat_g: acc.fat_g + item.macros.fat_g,
    carbs_g: acc.carbs_g + item.macros.carbs_g,
    fiber_g: acc.fiber_g + item.macros.fiber_g
  }), {
    kcal: 0,
    protein_g: 0,
    fat_g: 0,
    carbs_g: 0,
    fiber_g: 0
  });

  // Reconcile before returning
  const reconciliation = reconcileMacros(totals);

  return {
    items: items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      macros: item.macros,
      metadata: item.metadata
    })),
    totals: reconciliation.reconciled,
    metadata: {
      reconciled: reconciliation.adjustmentMade,
      reconciliationReason: reconciliation.reason
    }
  };
}

/**
 * Reconcile macros using 4/4/9 rule
 *
 * When kcal ≠ (4P + 4C + 9F), recompute kcal from macros.
 * Macros are source of truth.
 */
export function reconcileMacros(totals: MacroSummary['totals']): ReconciliationResult {
  const TOLERANCE = 0.10; // 10%

  // Calculate expected kcal from macros (4/4/9 rule, no rounding)
  const calculatedKcal =
    totals.protein_g * 4 +
    totals.carbs_g * 4 +
    totals.fat_g * 9;

  // Check if within tolerance
  const delta = Math.abs(totals.kcal - calculatedKcal);
  const ratio = calculatedKcal > 0 ? delta / calculatedKcal : 0;

  if (ratio <= TOLERANCE) {
    // Within tolerance, no adjustment
    return {
      original: totals,
      reconciled: totals,
      adjustmentMade: false
    };
  }

  // Outside tolerance, recompute kcal from macros
  console.warn('[reconcile] Kcal/macro mismatch detected', {
    originalKcal: totals.kcal,
    calculatedKcal,
    delta,
    ratio: `${(ratio * 100).toFixed(1)}%`
  });

  return {
    original: totals,
    reconciled: {
      ...totals,
      kcal: calculatedKcal // Use calculated value (unrounded)
    },
    adjustmentMade: true,
    reason: `Adjusted kcal from ${totals.kcal.toFixed(1)} to ${calculatedKcal.toFixed(1)} to match macros (4/4/9 rule)`
  };
}
