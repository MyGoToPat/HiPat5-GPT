/**
 * Brand Servings Map (Locale-Aware)
 * Normalized keys: brand:country:item:serving (all lowercase, no spaces)
 */

import type { MacroResult, NormalizedItem } from './types';

/**
 * Build normalized brand key (consistent normalization)
 * Format: brand:country:item:serving (all lowercase, no spaces, no special chars)
 */
export function buildBrandKey(
  brand: string,
  item: string,
  serving_label: string | null,
  size_label: string | null,
  country: string = 'us'
): string {
  const brandNorm = brand.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const itemNorm = item.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const servingNorm = serving_label?.toLowerCase().replace(/[^a-z0-9-]+/g, '') || '';
  const sizeNorm = size_label?.toLowerCase().replace(/[^a-z0-9]+/g, '') || '';
  const countryNorm = country.toLowerCase();
  
  // Build key: brand:country:item:serving or brand:country:item:size
  if (servingNorm) {
    return `${brandNorm}:${countryNorm}:${itemNorm}:${servingNorm}`;
  }
  if (sizeNorm) {
    return `${brandNorm}:${countryNorm}:${itemNorm}:${sizeNorm}`;
  }
  return `${brandNorm}:${countryNorm}:${itemNorm}`;
}

/**
 * Brand aliases for matching (no duplicate keys)
 */
const BRAND_ALIASES: Record<string, string[]> = {
  mcdonalds: [
    "mcdonalds", "mcdonald's", "mc donalds", "mc donald's", "mcd", "mickey d's", "mickeyd's"
  ]
  // extend with other brands later
};

/**
 * Product cues → brand (detect by item name)
 */
const PRODUCT_CUES: Record<string, 'mcdonalds'> = {
  "mcchicken": "mcdonalds",
  "mcnuggets": "mcdonalds",
  "chicken mcnuggets": "mcdonalds",
  "big mac": "mcdonalds",
  "quarter pounder": "mcdonalds",
  "mccafe": "mcdonalds"
};

export function normalizeBrandName(name: string): string {
  const lower = name.toLowerCase();
  
  // Check product cues first (e.g., "McChicken" → "McDonald's")
  for (const [product, brand] of Object.entries(PRODUCT_CUES)) {
    if (lower.includes(product)) {
      return brand;
    }
  }
  
  // Check brand aliases
  for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
    if (aliases.some(alias => lower.includes(alias))) {
      return canonical;
    }
  }
  
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Detect brand from item name using product cues and aliases
 * Returns canonical brand display name (e.g., "McDonald's") or null
 */
export function detectBrandFromItemName(name: string): string | null {
  const lower = name.toLowerCase();
  
  // Check product cues first (e.g., "McChicken" → "McDonald's")
  for (const [cue, brand] of Object.entries(PRODUCT_CUES)) {
    if (lower.includes(cue)) {
      return "McDonald's"; // canonical display name
    }
  }
  
  // Check brand aliases
  for (const [canonical, aliases] of Object.entries(BRAND_ALIASES)) {
    if (aliases.some(a => lower.includes(a))) {
      return "McDonald's"; // canonical display name
    }
  }
  
  return null;
}

/**
 * Brand servings map (normalized keys)
 */
export const BRAND_SERVINGS: Record<string, {
  serving_label: string;
  grams_per_serving: number;
  macros: { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number };
}> = {
  // US McDonald's - normalized keys (no spaces)
  'mcdonalds:us:bigmac:1sandwich': {
    serving_label: '1 sandwich',
    grams_per_serving: 217,
    macros: { kcal: 590, protein_g: 25, carbs_g: 47, fat_g: 34, fiber_g: 3 }
  },
  'mcdonalds:us:chickenmcnuggets:10-piece': {
    serving_label: '10-piece',
    grams_per_serving: 160,
    macros: { kcal: 420, protein_g: 23, carbs_g: 26, fat_g: 24, fiber_g: 1 }
  },
  'mcdonalds:us:fries:large': {
    serving_label: 'large',
    grams_per_serving: 154,
    macros: { kcal: 520, protein_g: 6, carbs_g: 63, fat_g: 25, fiber_g: 5 }
  },
  'mcdonalds:us:chickenmcnuggets:6-piece': {
    serving_label: '6-piece',
    grams_per_serving: 96,
    macros: { kcal: 252, protein_g: 14, carbs_g: 16, fat_g: 14, fiber_g: 1 }
  },
  'mcdonalds:us:mcchicken:1sandwich': {
    serving_label: '1 sandwich',
    grams_per_serving: 143,
    macros: { kcal: 400, protein_g: 15, carbs_g: 42, fat_g: 20, fiber_g: 2 }
  },
  // CA McDonald's (same for now, but can differ)
  'mcdonalds:ca:bigmac:1sandwich': {
    serving_label: '1 sandwich',
    grams_per_serving: 217,
    macros: { kcal: 590, protein_g: 25, carbs_g: 47, fat_g: 34, fiber_g: 3 }
  },
  'mcdonalds:ca:chickenmcnuggets:10-piece': {
    serving_label: '10-piece',
    grams_per_serving: 160,
    macros: { kcal: 420, protein_g: 23, carbs_g: 26, fat_g: 24, fiber_g: 1 }
  },
  'mcdonalds:ca:fries:large': {
    serving_label: 'large',
    grams_per_serving: 154,
    macros: { kcal: 520, protein_g: 6, carbs_g: 63, fat_g: 25, fiber_g: 5 }
  }
};






