/**
 * Deterministic Macro Formatter
 * Pure template-based formatting with PROTECT markers
 * NO LLM - guarantees identical output for identical input
 */

export interface MacroItem {
  name: string;
  qty: number;
  unit?: string | null;
  brand?: string | null;
  grams_used: number;
  basis: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface MacroTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface MacroPayload {
  items: MacroItem[];
  totals: MacroTotals;
  consumed?: boolean;
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
 * Format macro payload into deterministic bullet format
 * Implements MACRO_FORMATTER_TEMPLATE exactly
 */
export function formatMacroPayload(payload: MacroPayload): string {
  const lines: string[] = [];

  // Start protected block
  lines.push('[[PROTECT_BULLETS_START]]');

  // Per-item bullets
  for (const item of payload.items) {
    const qtyDisplay = item.qty || 1;
    const unitDisplay = item.unit || '';

    // Build quantity line
    const nameLine = unitDisplay
      ? `${qtyDisplay} ${unitDisplay} ${item.name}`
      : `${qtyDisplay} ${item.name}`;

    lines.push(nameLine);
    lines.push(`• Calories: ${round(item.kcal)} kcal`);
    lines.push(`• Protein: ${round1(item.protein_g)} g`);
    lines.push(`• Carbs: ${round1(item.carbs_g)} g`);
    lines.push(`• Fat: ${round1(item.fat_g)} g`);

    // Only show fiber if > 0
    if (item.fiber_g > 0) {
      lines.push(`• Fiber: ${round1(item.fiber_g)} g`);
    }

    lines.push(''); // Blank line between items
  }

  // Totals
  lines.push(`Total calories ${round(payload.totals.kcal)}`);

  // Show total fiber if > 0
  if (payload.totals.fiber_g > 0) {
    lines.push(`Total fiber ${round1(payload.totals.fiber_g)} g`);
  }

  lines.push(''); // Blank line before log hint

  // End protected block
  lines.push('[[PROTECT_BULLETS_END]]');

  lines.push(''); // Blank line before log hint
  lines.push('Say "Log All" or "Log (food item)"');

  return lines.join('\n');
}

/**
 * Check if text contains protected macro bullets
 */
export function hasProtectedBullets(text: string): boolean {
  return text.includes('[[PROTECT_BULLETS_START]]') ||
         text.includes('• Calories:') ||
         text.includes('Total calories');
}

/**
 * Extract protected regions from text
 */
export function extractProtectedRegions(text: string): { protected: string[]; unprotected: string[] } {
  const protected: string[] = [];
  const unprotected: string[] = [];

  const parts = text.split(/(\[\[PROTECT_BULLETS_START\]\][\s\S]*?\[\[PROTECT_BULLETS_END\]\])/g);

  for (const part of parts) {
    if (part.includes('[[PROTECT_BULLETS_START]]')) {
      protected.push(part);
    } else if (part.trim()) {
      unprotected.push(part);
    }
  }

  return { protected, unprotected };
}
