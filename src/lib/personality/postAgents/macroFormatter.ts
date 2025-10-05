/**
 * Macro Formatter Post-Agent
 *
 * Single source of truth for macro/calorie response formatting.
 * Formats responses as per-item bullets + Totals + Log hint.
 *
 * DETERMINISTIC APPROACH:
 * 1. Checks for structured draft.meta.macros (items[] + totals)
 * 2. Falls back to regex extraction from text
 */

interface MacroItem {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface MacroPayload {
  items: MacroItem[];
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

/**
 * Round to 1 decimal place, strip trailing .0
 */
function round1(n?: number): string {
  if (n === undefined || n === null) return '0';
  return n.toFixed(1).replace(/\.0$/, '');
}

/**
 * Check if two macro objects are within 3% of each other
 */
function within3pct(a: any, b: any): boolean {
  const fields = ['kcal', 'protein_g', 'carbs_g', 'fat_g'] as const;
  const eps = 0.03;

  for (const f of fields) {
    const A = Number(a?.[f] ?? 0);
    const B = Number(b?.[f] ?? 0);

    if (A === 0 && B === 0) continue;
    if (B === 0 && A !== 0) return false;
    if (Math.abs(A - B) / Math.max(1, Math.abs(B)) > eps) return false;
  }

  return true;
}

/**
 * Main formatting function - uses structured JSON when available
 */
export function formatMacros(draft: { text: string; meta?: any }): string {
  const items = draft?.meta?.macros?.items;
  const totals = draft?.meta?.macros?.totals;

  // DETERMINISTIC PATH: Use structured JSON if present
  if (Array.isArray(items) && items.length && totals) {
    // Debug log for development
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug('[macroFormatter] Rendering itemized block:', items.length, 'items');
    }

    let out = '[[PROTECT_BULLETS_START]]\n';

    // Render each item
    for (const it of items) {
      out += `${it.name}\n`;
      out += `• Calories: ${Math.round(it.kcal)} kcal\n`;
      out += `• Protein: ${round1(it.protein_g)} g\n`;
      out += `• Carbs: ${round1(it.carbs_g)} g\n`;
      out += `• Fat: ${round1(it.fat_g)} g\n\n`;
    }

    // Recompute totals to guard against drift
    const recomputed = items.reduce(
      (acc, i) => ({
        kcal: acc.kcal + (i.kcal || 0),
        protein_g: acc.protein_g + (i.protein_g || 0),
        carbs_g: acc.carbs_g + (i.carbs_g || 0),
        fat_g: acc.fat_g + (i.fat_g || 0),
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );

    // Use recomputed if difference > 3%, else use provided totals
    const useTotals = within3pct(recomputed, totals) ? totals : recomputed;

    // Render totals
    out += `Totals\n`;
    out += `• Calories: ${Math.round(useTotals.kcal)} kcal\n`;
    out += `• Protein: ${round1(useTotals.protein_g)} g\n`;
    out += `• Carbs: ${round1(useTotals.carbs_g)} g\n`;
    out += `• Fat: ${round1(useTotals.fat_g)} g\n\n`;

    // Add "Log" hint ONLY for macro-question route (informational queries)
    if (draft?.meta?.route === 'macro-question') {
      out += `Log\n`;
      out += `Just say "Log" if you want me to log this in your macros as a meal.\n`;
    }

    out += '[[PROTECT_BULLETS_END]]';

    return out;
  }

  // FALLBACK PATH: Try to extract from text
  return formatFromTextFallback(draft.text);
}

/**
 * Legacy string-based formatter (fallback when no structured data)
 */
function formatFromTextFallback(input: string): string {
  // Try to find JSON payload embedded in text
  const jsonMatch = input.match(/\{[\s\S]*"items"[\s\S]*"totals"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.items && parsed.totals) {
        // Recursively call with structured data
        return formatMacros({ text: input, meta: { macros: parsed } });
      }
    } catch (e) {
      // Continue to regex fallback
    }
  }

  // Try to detect itemized structure already in text
  const itemPattern = /^([^\n•]+)\n[•\-\*]\s*Calories?:\s*([\d\.]+)\s*kcal.*?[•\-\*]\s*Protein:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Carbs?:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Fat:\s*([\d\.]+)\s*g/gims;
  const totalsPattern = /Totals?\s*\n[•\-\*]\s*Calories?:\s*([\d\.]+)\s*kcal.*?[•\-\*]\s*Protein:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Carbs?:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Fat:\s*([\d\.]+)\s*g/is;

  const items: MacroItem[] = [];
  let match;

  while ((match = itemPattern.exec(input)) !== null) {
    items.push({
      name: match[1].trim(),
      kcal: parseFloat(match[2]),
      protein_g: parseFloat(match[3]),
      carbs_g: parseFloat(match[4]),
      fat_g: parseFloat(match[5])
    });
  }

  const totalsMatch = input.match(totalsPattern);
  if (items.length > 0 && totalsMatch) {
    const payload: MacroPayload = {
      items,
      totals: {
        kcal: parseFloat(totalsMatch[1]),
        protein_g: parseFloat(totalsMatch[2]),
        carbs_g: parseFloat(totalsMatch[3]),
        fat_g: parseFloat(totalsMatch[4])
      }
    };
    return formatMacros({ text: input, meta: { macros: payload } });
  }

  // Try simple single-item format (totals only)
  const simple = formatSimpleMacroBlock(input);
  if (simple !== input) {
    return `[[PROTECT_BULLETS_START]]\n${simple}\n[[PROTECT_BULLETS_END]]`;
  }

  // Not a macro response, return unchanged
  return input;
}

/**
 * Simple single-item formatter (when only totals are present)
 */
function formatSimpleMacroBlock(input: string): string {
  const patterns = [
    /(?:•|\-|\*|Calories?:?)\s*(?:Calories?:?)?\s*([\d\.]+)\s*kcal/i,
    /(?:•|\-|\*|Protein?:?)\s*(?:Protein?:?)?\s*([\d\.]+)\s*g/i,
    /(?:•|\-|\*|Carbs?:?|Carbohydrates?:?)\s*(?:Carbs?:?|Carbohydrates?:?)?\s*([\d\.]+)\s*g/i,
    /(?:•|\-|\*|Fat?:?)\s*(?:Fat?:?)?\s*([\d\.]+)\s*g/i,
  ];

  const get = (re: RegExp): string | null => {
    const m = input.match(re);
    return m ? m[1] : null;
  };

  const cals = get(patterns[0]);
  const prot = get(patterns[1]);
  const carbs = get(patterns[2]);
  const fat = get(patterns[3]);

  if (cals && prot && carbs && fat) {
    return (
      `• Calories: ${cals} kcal\n` +
      `• Protein: ${prot} g\n` +
      `• Carbs: ${carbs} g\n` +
      `• Fat: ${fat} g\n\n` +
      `Log\n` +
      `Just say "Log" if you want me to log this in your macros as a meal.`
    );
  }

  return input;
}

/**
 * Legacy export for backward compatibility
 */
export function formatMacroBlock(input: string): string {
  return formatMacros({ text: input });
}

/**
 * Detect if input contains macro/nutrition data
 */
export function isMacroResponse(input: string): boolean {
  const lowerInput = input.toLowerCase();
  const keywords = ['calories', 'protein', 'carbs', 'fat', 'kcal'];
  let matchCount = 0;

  for (const keyword of keywords) {
    if (lowerInput.includes(keyword)) {
      matchCount++;
    }
  }

  return matchCount >= 3;
}
