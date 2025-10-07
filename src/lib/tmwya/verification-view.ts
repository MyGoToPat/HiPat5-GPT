/**
 * TMWYA Verification View Builder
 * Deterministic template for meal confirmation UI
 * Shows fiber per item and in totals
 */

export interface VerificationItem {
  name: string;
  qty: number;
  unit?: string | null;
  grams_used: number;
  basis: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface VerificationTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface TDEEComparison {
  meal_kcal: number;
  daily_kcal_consumed: number;
  daily_kcal_target: number;
  daily_kcal_remaining: number;
  meal_as_pct_of_daily: number;
  protein_consumed: number;
  protein_target: number;
  protein_remaining: number;
  on_track: boolean;
  message: string;
}

export interface TEFData {
  tef_kcal: number;
  net_kcal: number;
  tef_breakdown: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface VerificationPayload {
  items: VerificationItem[];
  totals: VerificationTotals;
  tef?: TEFData;
  tdee?: TDEEComparison;
  meal_slot?: string;
}

/**
 * Round to nearest integer
 */
function round(n: number): number {
  return Math.round(n);
}

/**
 * Round to 1 decimal place, remove trailing .0
 */
function round1(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

/**
 * Build deterministic verification view text
 * Implements VERIFY_VIEW_TEMPLATE
 */
export function buildVerificationView(payload: VerificationPayload): string {
  const lines: string[] = [];

  lines.push('Review and confirm:');
  lines.push('');

  // Per-item display
  for (const item of payload.items) {
    const qtyDisplay = item.qty || 1;
    const unitDisplay = item.unit || '';
    const gramsDisplay = `(${round(item.grams_used)}g ${item.basis})`;

    const nameLine = unitDisplay
      ? `${qtyDisplay} ${unitDisplay} ${item.name} ${gramsDisplay}`
      : `${qtyDisplay} ${item.name} ${gramsDisplay}`;

    lines.push(nameLine);
    lines.push(`• Calories: ${round(item.kcal)} kcal`);
    lines.push(`• Protein: ${round1(item.protein_g)} g`);
    lines.push(`• Carbs: ${round1(item.carbs_g)} g`);
    lines.push(`• Fat: ${round1(item.fat_g)} g`);

    // Show fiber if > 0
    if (item.fiber_g > 0) {
      lines.push(`• Fiber: ${round1(item.fiber_g)} g`);
    }

    lines.push(''); // Blank line between items
  }

  // Totals
  lines.push(`Total: ${round(payload.totals.kcal)} kcal`);

  // Show total fiber if > 0
  if (payload.totals.fiber_g > 0) {
    lines.push(`Total fiber: ${round1(payload.totals.fiber_g)} g`);
  }

  // TEF (optional)
  if (payload.tef) {
    lines.push(`TEF: ${round(payload.tef.tef_kcal)} kcal`);
    lines.push(`Net: ${round(payload.tef.net_kcal)} kcal`);
  }

  lines.push('');

  // TDEE comparison
  if (payload.tdee) {
    lines.push(`Remaining today: ${round(payload.tdee.daily_kcal_remaining)} kcal`);
    if (payload.tdee.on_track) {
      lines.push('✓ On track');
    } else {
      lines.push(payload.tdee.message);
    }
    lines.push('');
  }

  lines.push('[Confirm & Log]');

  return lines.join('\n');
}

/**
 * Build verification view for UI components (structured data)
 * Returns JSON-serializable object for React components
 */
export function buildVerificationData(payload: VerificationPayload) {
  return {
    items: payload.items.map(item => ({
      name: item.name,
      qty: item.qty,
      unit: item.unit,
      grams: round(item.grams_used),
      basis: item.basis,
      macros: {
        kcal: round(item.kcal),
        protein_g: parseFloat(round1(item.protein_g)),
        carbs_g: parseFloat(round1(item.carbs_g)),
        fat_g: parseFloat(round1(item.fat_g)),
        fiber_g: item.fiber_g > 0 ? parseFloat(round1(item.fiber_g)) : 0
      }
    })),
    totals: {
      kcal: round(payload.totals.kcal),
      protein_g: parseFloat(round1(payload.totals.protein_g)),
      carbs_g: parseFloat(round1(payload.totals.carbs_g)),
      fat_g: parseFloat(round1(payload.totals.fat_g)),
      fiber_g: payload.totals.fiber_g > 0 ? parseFloat(round1(payload.totals.fiber_g)) : 0
    },
    tef: payload.tef ? {
      tef_kcal: round(payload.tef.tef_kcal),
      net_kcal: round(payload.tef.net_kcal)
    } : null,
    tdee: payload.tdee ? {
      remaining: round(payload.tdee.daily_kcal_remaining),
      on_track: payload.tdee.on_track,
      message: payload.tdee.message
    } : null,
    meal_slot: payload.meal_slot || 'unknown'
  };
}
