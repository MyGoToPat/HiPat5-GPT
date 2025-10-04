/**
 * Macro Formatter Post-Agent
 *
 * Single source of truth for macro/calorie response formatting.
 * Ensures all macro responses follow the exact vertical bullet format:
 *
 * • Calories: XXX kcal
 * • Protein: XX g
 * • Carbs: XX g
 * • Fat: XX g
 *
 * Log
 * Just say "Log" if you want me to log this in your macros as a meal.
 */

export function formatMacroBlock(input: string): string {
  // Regex patterns to detect and extract macro values
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
  const fat  = get(lines[3]);

  // If all four macros exist, rebuild clean vertical block
  if (cals && prot && carbs && fat) {
    const block =
      `• Calories: ${cals} kcal\n` +
      `• Protein: ${prot} g\n` +
      `• Carbs: ${carbs} g\n` +
      `• Fat: ${fat} g\n` +
      `\n` +
      `Log\n` +
      `Just say "Log" if you want me to log this in your macros as a meal.`;

    // Wrap with markers so later post-agents don't mangle the list
    return `[[PROTECT_BULLETS_START]]\n${block}\n[[PROTECT_BULLETS_END]]`;
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

  // Must contain at least 3 macro keywords to be considered a macro response
  return matchCount >= 3;
}
