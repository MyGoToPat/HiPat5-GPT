/**
 * DETERMINISTIC MACRO FORMATTER
 * Exact format as specified - NO LLM calls, NO recalculation
 */

export type Macros = {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g?: number;
};

export type Item = {
  name: string;
  quantity: number;
  unit: string;
  assumptions?: string[];
  macros: Macros;
};

export type FoodResult = {
  items: Item[];
  totals: Macros;
  assumptions?: string[];
};

/**
 * Format number with space thousand separator (e.g., 1210 → "1 210")
 */
function sp(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Format macros in exact USDA format
 * This is the ONLY way food macros should be formatted
 */
export function formatMacrosUSDA(r: FoodResult): string {
  const lines: string[] = [];

  lines.push('I calculated macros using standard USDA values.\n');

  for (const it of r.items) {
    const label = it.assumptions?.includes('cooked') || it.name.toLowerCase().includes('oatmeal')
      ? `${it.name[0].toUpperCase()}${it.name.slice(1)} (${it.quantity} ${it.unit} cooked)`
      : `${it.name[0].toUpperCase()}${it.name.slice(1)} (${it.quantity} ${it.unit})`;

    lines.push(`${label}`);
    lines.push(`• Protein ${Math.round(it.macros.protein_g)} g`);
    lines.push(`• Fat ${Math.round(it.macros.fat_g)} g`);
    lines.push(`• Carbs ${Math.round(it.macros.carbs_g)} g\n`);
  }

  lines.push('Totals');
  lines.push(`• Protein ${Math.round(r.totals.protein_g)} g`);
  lines.push(`• Fat ${Math.round(r.totals.fat_g)} g`);
  lines.push(`• Carbs ${Math.round(r.totals.carbs_g)} g`);
  lines.push(`• Calories ≈ ${sp(r.totals.kcal)} kcal\n`);

  lines.push('Type "Log" to log all or "Log (items)" to log your choices — or do you have any questions?');

  return lines.join('\n');
}

/**
 * Format for validation screen (with TODAY KPIs)
 */
export function formatForValidation(result: FoodResult, todayKpis?: Macros): string {
  const lines: string[] = [];

  if (todayKpis) {
    lines.push('═══ TODAY\'S TOTALS ═══');
    lines.push(`${sp(todayKpis.kcal)} kcal | ${Math.round(todayKpis.protein_g)}g P | ${Math.round(todayKpis.fat_g)}g F | ${Math.round(todayKpis.carbs_g)}g C | ${Math.round(todayKpis.fiber_g || 0)}g Fib\n`);
  }

  lines.push('═══ MEAL TO LOG ═══');

  for (const item of result.items) {
    lines.push(`${item.name} | ${item.quantity} ${item.unit} | ${Math.round(item.macros.kcal)} kcal | ${Math.round(item.macros.protein_g)}g P | ${Math.round(item.macros.carbs_g)}g C | ${Math.round(item.macros.fat_g)}g F | ${Math.round(item.macros.fiber_g || 0)}g Fib`);
  }

  if (result.assumptions && result.assumptions.length > 0) {
    lines.push(`\nAssumptions: ${result.assumptions.join(', ')}`);
  }

  return lines.join('\n');
}
