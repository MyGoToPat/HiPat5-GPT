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
  fiber_g?: number;  // NEW: Dietary fiber in grams (optional for backward compat)
  qty?: number;      // Quantity (e.g., 3 for "3 eggs")
  unit?: string;     // Unit (e.g., "large" for "3 large eggs")
}

interface MacroPayload {
  items: MacroItem[];
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;  // NEW (optional for backward compat)
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

    // Render each item with quantity (Phase 5 format)
    for (const it of items) {
      // Include quantity: "10 Oz Ribeye", "3 Whole Eggs"
      const qtyDisplay = (it as any).qty || 1;
      const unitDisplay = (it as any).unit || '';
      const nameWithQty = unitDisplay ? `${qtyDisplay} ${unitDisplay} ${it.name}` : it.name;

      out += `${nameWithQty}\n`;
      out += `• Calories: ${Math.round(it.kcal)} kcal\n`;
      out += `• Protein: ${Math.round(it.protein_g * 10) / 10} g\n`;
      out += `• Carbs: ${Math.round(it.carbs_g * 10) / 10} g\n`;
      out += `• Fat: ${Math.round(it.fat_g * 10) / 10} g\n`;

      // Only show fiber line if > 0
      if (it.fiber_g && it.fiber_g > 0) {
        out += `• Fiber: ${Math.round(it.fiber_g * 10) / 10} g\n`;
      }
      out += '\n';
    }

    // Add TOTALS lines (Phase 5 requirement)
    out += `Total calories ${Math.round(totals.kcal)}\n`;
    // Always show total fiber (even if 0)
    out += `Total fiber ${Math.round((totals.fiber_g || 0) * 10) / 10} g\n\n`;

    // Add "Log" hint for macro-question route
    if (draft?.meta?.route === 'macro-question') {
      out += `Say "Log All" or "Log (Food item)"\n`;
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
  const itemPattern = /^For\s+([^\n:]+):\s*\n[•\-\*]\s*Calories?:\s*([\d\.]+)\s*kcal.*?[•\-\*]\s*Protein:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Carbs?:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Fat:\s*([\d\.]+)\s*g/gims;

  const items: MacroItem[] = [];
  let match;

  while ((match = itemPattern.exec(input)) !== null) {
    items.push({
      name: match[1].trim(),
      kcal: parseFloat(match[2]),
      protein_g: parseFloat(match[3]),
      carbs_g: parseFloat(match[4]),
      fat_g: parseFloat(match[5]),
      fiber_g: 0  // Default to 0 for legacy text parsing
    });
  }

  if (items.length > 0) {
    // Compute totals from items
    const totals = items.reduce(
      (acc, it) => ({
        kcal: acc.kcal + it.kcal,
        protein_g: acc.protein_g + it.protein_g,
        carbs_g: acc.carbs_g + it.carbs_g,
        fat_g: acc.fat_g + it.fat_g,
        fiber_g: acc.fiber_g + (it.fiber_g || 0),
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
    );

    const payload: MacroPayload = {
      items,
      totals
    };
    return formatMacros({ text: input, meta: { macros: payload, route: 'macro-question' } });
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
 * Used for single food items without "For X:" prefix
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
    // Try to extract food name from context
    const foodNameMatch = input.match(/(?:for|of|in)\s+(?:a\s+|an\s+)?([^.?!\n]+)/i);
    const foodName = foodNameMatch ? foodNameMatch[1].trim() : 'this food';

    return (
      `For ${foodName}:\n` +
      `• Calories: ${Math.round(parseFloat(cals))} kcal\n` +
      `• Protein: ${Math.round(parseFloat(prot))} g\n` +
      `• Carbs: ${Math.round(parseFloat(carbs))} g\n` +
      `• Fat: ${Math.round(parseFloat(fat))} g\n\n` +
      `Say "log" if you want me to log all this, or tell me to log which specific food.`
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
