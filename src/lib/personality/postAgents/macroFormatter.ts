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
 * Main formatting function - uses structured JSON when available
 */
export function formatMacros(draft: { text: string; meta?: any }): string {
  const items = draft?.meta?.macros?.items;
  const totals = draft?.meta?.macros?.totals;

  // DETERMINISTIC PATH: Use structured JSON if present
  if (Array.isArray(items) && items.length && totals) {
    let out = '[[PROTECT_BULLETS_START]]\n';

    for (const it of items) {
      out += `${it.name}\n`;
      out += `• Calories: ${Math.round(it.kcal)} kcal\n`;
      out += `• Protein: ${round1(it.protein_g)} g\n`;
      out += `• Carbs: ${round1(it.carbs_g)} g\n`;
      out += `• Fat: ${round1(it.fat_g)} g\n\n`;
    }

    out += `Totals\n`;
    out += `• Calories: ${Math.round(totals.kcal)} kcal\n`;
    out += `• Protein: ${round1(totals.protein_g)} g\n`;
    out += `• Carbs: ${round1(totals.carbs_g)} g\n`;
    out += `• Fat: ${round1(totals.fat_g)} g\n\n`;

    out += `Log\n`;
    out += `Just say "Log" if you want me to log this in your macros as a meal.\n`;
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
