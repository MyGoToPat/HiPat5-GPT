/**
 * Macro Formatter Post-Agent
 *
 * Single source of truth for macro/calorie response formatting.
 * Formats responses as per-item bullets + Totals + Log hint.
 *
 * Expected resolver payload shape:
 * {
 *   items: [{ name, qty, unit, grams, macros: { kcal, protein_g, carbs_g, fat_g } }, ...],
 *   totals: { kcal, protein_g, carbs_g, fat_g }
 * }
 */

interface MacroItem {
  name: string;
  qty?: number;
  unit?: string;
  grams?: number;
  macros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

interface ResolverPayload {
  items: MacroItem[];
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

/**
 * Attempts to extract resolver payload from input text.
 * Looks for JSON-like structure or structured macro data.
 */
function extractResolverPayload(input: string): ResolverPayload | null {
  // Try to find JSON payload in the input
  const jsonMatch = input.match(/\{[\s\S]*"items"[\s\S]*"totals"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.items && parsed.totals) {
        return parsed as ResolverPayload;
      }
    } catch (e) {
      // Not valid JSON, continue
    }
  }

  // Try to detect itemized structure in text (format: [name]\n• Calories: ...)
  const itemPattern = /^([^\n•]+)\n[•\-\*]\s*Calories?:\s*([\d\.]+)\s*kcal.*?[•\-\*]\s*Protein:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Carbs?:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Fat:\s*([\d\.]+)\s*g/gims;
  const totalsPattern = /Totals?\s*\n[•\-\*]\s*Calories?:\s*([\d\.]+)\s*kcal.*?[•\-\*]\s*Protein:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Carbs?:\s*([\d\.]+)\s*g.*?[•\-\*]\s*Fat:\s*([\d\.]+)\s*g/is;

  const items: MacroItem[] = [];
  let match;

  while ((match = itemPattern.exec(input)) !== null) {
    items.push({
      name: match[1].trim(),
      macros: {
        kcal: parseFloat(match[2]),
        protein_g: parseFloat(match[3]),
        carbs_g: parseFloat(match[4]),
        fat_g: parseFloat(match[5])
      }
    });
  }

  const totalsMatch = input.match(totalsPattern);
  if (items.length > 0 && totalsMatch) {
    return {
      items,
      totals: {
        kcal: parseFloat(totalsMatch[1]),
        protein_g: parseFloat(totalsMatch[2]),
        carbs_g: parseFloat(totalsMatch[3]),
        fat_g: parseFloat(totalsMatch[4])
      }
    };
  }

  return null;
}

/**
 * Formats a resolver payload as itemized bullets + Totals + Log hint
 */
function formatItemizedMacros(payload: ResolverPayload): string {
  let output = '';

  // Format each item
  for (const item of payload.items) {
    const itemName = item.name || 'Unknown item';

    output += `${itemName}\n`;
    output += `• Calories: ${item.macros.kcal} kcal\n`;
    output += `• Protein: ${item.macros.protein_g} g\n`;
    output += `• Carbs: ${item.macros.carbs_g} g\n`;
    output += `• Fat: ${item.macros.fat_g} g\n\n`;
  }

  // Format totals
  output += `Totals\n`;
  output += `• Calories: ${payload.totals.kcal} kcal\n`;
  output += `• Protein: ${payload.totals.protein_g} g\n`;
  output += `• Carbs: ${payload.totals.carbs_g} g\n`;
  output += `• Fat: ${payload.totals.fat_g} g\n\n`;

  // Add Log hint
  output += `Log\n`;
  output += `Just say "Log" if you want me to log this in your macros as a meal.`;

  return output;
}

/**
 * Legacy simple macro block formatter (fallback for non-itemized responses)
 */
function formatSimpleMacroBlock(input: string): string {
  const lines = [
    /(?:•|\-|\*|Calories?:?)\s*(?:Calories?:?)?\s*([\d\.]+)\s*kcal/i,
    /(?:•|\-|\*|Protein?:?)\s*(?:Protein?:?)?\s*([\d\.]+)\s*g/i,
    /(?:•|\-|\*|Carbs?:?|Carbohydrates?:?)\s*(?:Carbs?:?|Carbohydrates?:?)?\s*([\d\.]+)\s*g/i,
    /(?:•|\-|\*|Fat?:?)\s*(?:Fat?:?)?\s*([\d\.]+)\s*g/i,
  ];

  const get = (re: RegExp): string | null => {
    const m = input.match(re);
    return m ? m[1] : null;
  };

  const cals = get(lines[0]);
  const prot = get(lines[1]);
  const carbs = get(lines[2]);
  const fat = get(lines[3]);

  if (cals && prot && carbs && fat) {
    const block =
      `• Calories: ${cals} kcal\n` +
      `• Protein: ${prot} g\n` +
      `• Carbs: ${carbs} g\n` +
      `• Fat: ${fat} g\n` +
      `\n` +
      `Log\n` +
      `Just say "Log" if you want me to log this in your macros as a meal.`;

    return block;
  }

  return input;
}

/**
 * Main formatting function - detects payload type and formats accordingly
 */
export function formatMacroBlock(input: string): string {
  // Try to extract structured resolver payload
  const payload = extractResolverPayload(input);

  if (payload && payload.items.length > 0) {
    // Itemized format
    const formatted = formatItemizedMacros(payload);
    return `[[PROTECT_BULLETS_START]]\n${formatted}\n[[PROTECT_BULLETS_END]]`;
  }

  // Try simple single-item format
  const simple = formatSimpleMacroBlock(input);
  if (simple !== input) {
    return `[[PROTECT_BULLETS_START]]\n${simple}\n[[PROTECT_BULLETS_END]]`;
  }

  // Not a macro response, return unchanged
  return input;
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
