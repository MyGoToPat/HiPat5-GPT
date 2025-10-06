/**
 * Nutrition Resolver Adapter
 *
 * Single source of truth for nutrition resolution across all routes.
 * Both macro-question and tmwya paths use this adapter.
 *
 * Supports:
 * - External HTTP resolver via NUTRITION_RESOLVER_URL env var
 * - Supabase RPC fallback (resolve_nutrition)
 * - Telemetry logging for monitoring
 */

import { supabase } from '../supabase';

export interface NutritionItem {
  name: string;
  qty: number;
  unit: string;
  brand?: string;
  basis?: 'cooked' | 'raw' | 'as-served';
}

export interface ResolvedNutrition {
  name: string;
  qty: number;
  unit: string;
  grams_used: number;
  basis_used: string;
  macros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
  };
  per_unit_macros?: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
  };
  per_unit_grams?: number;
  brand?: string;
}

/**
 * Validates that the nutrition resolver is properly configured
 */
export function validateResolverConfig(): boolean {
  const externalUrl = import.meta.env.VITE_NUTRITION_RESOLVER_URL;

  if (!externalUrl) {
    console.info('[nutrition-resolver] No external URL configured, will use Supabase RPC');
  } else {
    console.info('[nutrition-resolver] External resolver configured:', externalUrl);
  }

  return true; // Always valid - falls back to RPC
}

/**
 * Resolves nutrition data for an array of food items
 *
 * @param items - Array of food items to resolve
 * @returns Promise resolving to array of nutrition data
 */
export async function resolveNutrition(
  items: NutritionItem[]
): Promise<ResolvedNutrition[]> {
  const startTime = Date.now();

  // Log telemetry for resolution request
  console.info('[nutrition-resolver:request]', {
    itemCount: items.length,
    items: items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, basis: i.basis })),
    timestamp: startTime,
  });

  try {
    // Check for external resolver URL
    const externalUrl = import.meta.env.VITE_NUTRITION_RESOLVER_URL;

    if (externalUrl) {
      return await resolveViaHttp(externalUrl, items, startTime);
    } else {
      return await resolveViaSupabase(items, startTime);
    }
  } catch (error) {
    console.error('[nutrition-resolver:error]', {
      error,
      items,
      duration: Date.now() - startTime,
    });

    // Return fallback estimates on error
    return items.map(item => createFallbackEstimate(item));
  }
}

/**
 * Resolves nutrition via external HTTP endpoint
 */
async function resolveViaHttp(
  url: string,
  items: NutritionItem[],
  startTime: number
): Promise<ResolvedNutrition[]> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ items }),
  });

  if (!response.ok) {
    throw new Error(`HTTP resolver failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  const resolved = Array.isArray(result) ? result : result.items || [];

  console.info('[nutrition-resolver:http-success]', {
    itemCount: resolved.length,
    duration: Date.now() - startTime,
  });

  return resolved;
}

/**
 * Resolves nutrition via Supabase RPC
 */
async function resolveViaSupabase(
  items: NutritionItem[],
  startTime: number
): Promise<ResolvedNutrition[]> {
  // Normalize items with default basis
  const normalizedItems = items.map(item => ({
    name: item.name,
    qty: item.qty,
    unit: item.unit,
    brand: item.brand || null,
    basis: item.brand ? 'as-served' : (item.basis || 'cooked'),
  }));

  const { data, error } = await supabase.rpc('resolve_nutrition', {
    items: normalizedItems,
  });

  if (error) {
    throw new Error(`Supabase RPC failed: ${error.message}`);
  }

  const resolved = Array.isArray(data) ? data : [];

  // Calculate per-unit values for each resolved item
  const enriched = resolved.map((r: ResolvedNutrition) => ({
    ...r,
    per_unit_macros: {
      kcal: r.macros.kcal / r.qty,
      protein_g: r.macros.protein_g / r.qty,
      carbs_g: r.macros.carbs_g / r.qty,
      fat_g: r.macros.fat_g / r.qty,
      fiber_g: (r.macros.fiber_g || 0) / r.qty,
    },
    per_unit_grams: r.grams_used / r.qty,
  }));

  console.info('[nutrition-resolver:supabase-success]', {
    itemCount: enriched.length,
    duration: Date.now() - startTime,
    basis_used: enriched.map((r: ResolvedNutrition) => r.basis_used),
    grams_used: enriched.map((r: ResolvedNutrition) => r.grams_used),
    resolver_calls_count: 1,
  });

  return enriched;
}

/**
 * Creates a fallback estimate when resolution fails
 */
function createFallbackEstimate(item: NutritionItem): ResolvedNutrition {
  // Use basic unit conversions
  let grams = item.qty;

  switch (item.unit.toLowerCase()) {
    case 'oz':
      grams = item.qty * 28.35;
      break;
    case 'lb':
      grams = item.qty * 453.59;
      break;
    case 'g':
      grams = item.qty;
      break;
    case 'kg':
      grams = item.qty * 1000;
      break;
    case 'cup':
      grams = item.qty * 240;
      break;
    case 'tbsp':
      grams = item.qty * 15;
      break;
    case 'tsp':
      grams = item.qty * 5;
      break;
    case 'slice':
      grams = item.qty * 30;
      break;
    case 'count':
    case 'piece':
      grams = item.qty * 50;
      break;
    default:
      grams = item.qty * 100;
  }

  // Generic macro estimates (250 kcal per 100g average food)
  const kcal = Math.round(grams * 2.5);
  const protein_g = Math.round(grams * 0.15 * 10) / 10;
  const carbs_g = Math.round(grams * 0.25 * 10) / 10;
  const fat_g = Math.round(grams * 0.08 * 10) / 10;

  return {
    name: item.name,
    qty: item.qty,
    unit: item.unit,
    grams_used: Math.round(grams * 10) / 10,
    basis_used: item.brand ? 'as-served' : (item.basis || 'cooked'),
    macros: { kcal, protein_g, carbs_g, fat_g },
    per_unit_macros: {
      kcal: kcal / item.qty,
      protein_g: protein_g / item.qty,
      carbs_g: carbs_g / item.qty,
      fat_g: fat_g / item.qty,
    },
    per_unit_grams: Math.round((grams / item.qty) * 10) / 10,
    brand: item.brand,
  };
}

/**
 * Helper to parse natural language quantities from user input
 * Examples: "3 slices of bacon", "10 oz steak", "2 eggs"
 */
export function parseNaturalQuantity(text: string): NutritionItem[] {
  const items: NutritionItem[] = [];

  // Pattern: number + unit? + "of"? + food name
  // Examples: "3 slices bacon", "10 oz steak", "2 eggs", "1 cup rice"
  const patterns = [
    /(\d+(?:\.\d+)?)\s+(oz|g|kg|lb|cup|tbsp|tsp|slice|slices|piece|pieces)\s+(?:of\s+)?(.+)/gi,
    /(\d+(?:\.\d+)?)\s+(.+)/gi, // fallback for count-based
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      const qty = parseFloat(match[1]);
      let unit = 'count';
      let name = match[2];

      if (match.length > 3) {
        unit = match[2].toLowerCase().replace(/s$/, ''); // normalize plurals
        name = match[3];
      }

      // Detect brand/restaurant names (simple heuristic)
      const brand = detectBrand(name);

      items.push({
        name: name.trim(),
        qty,
        unit,
        brand,
        basis: brand ? 'as-served' : 'cooked',
      });
    }

    if (items.length > 0) break; // Found items, stop trying patterns
  }

  return items;
}

/**
 * Detects if food name contains a brand or restaurant
 */
function detectBrand(name: string): string | undefined {
  const knownBrands = [
    'mcdonalds', 'mcdonald\'s', 'burger king', 'wendy\'s', 'wendys',
    'chipotle', 'subway', 'starbucks', 'dunkin', 'taco bell',
    'kfc', 'popeyes', 'chick-fil-a', 'chickfila', 'panera',
    'dominos', 'domino\'s', 'pizza hut', 'papa john', 'little caesars',
  ];

  const lowerName = name.toLowerCase();
  for (const brand of knownBrands) {
    if (lowerName.includes(brand)) {
      return brand;
    }
  }

  return undefined;
}

/**
 * Adjusts quantity of a resolved item (for "log ribeye with 4 eggs" scenarios)
 * Uses per-unit calculation to avoid calling resolver again
 */
export function adjustItemQuantity(
  resolved: ResolvedNutrition,
  newQty: number
): ResolvedNutrition {
  // Calculate per-unit values if not already present
  const perUnitMacros = resolved.per_unit_macros || {
    kcal: resolved.macros.kcal / resolved.qty,
    protein_g: resolved.macros.protein_g / resolved.qty,
    carbs_g: resolved.macros.carbs_g / resolved.qty,
    fat_g: resolved.macros.fat_g / resolved.qty,
    fiber_g: (resolved.macros.fiber_g || 0) / resolved.qty,
  };

  const perUnitGrams = resolved.per_unit_grams || resolved.grams_used / resolved.qty;

  // Scale to new quantity
  return {
    name: resolved.name,
    qty: newQty,
    unit: resolved.unit,
    grams_used: Math.round(perUnitGrams * newQty * 10) / 10,
    basis_used: resolved.basis_used,
    macros: {
      kcal: Math.round(perUnitMacros.kcal * newQty),
      protein_g: Math.round(perUnitMacros.protein_g * newQty * 10) / 10,
      carbs_g: Math.round(perUnitMacros.carbs_g * newQty * 10) / 10,
      fat_g: Math.round(perUnitMacros.fat_g * newQty * 10) / 10,
      fiber_g: Math.round((perUnitMacros.fiber_g || 0) * newQty * 10) / 10,
    },
    per_unit_macros: perUnitMacros,
    per_unit_grams: perUnitGrams,
    brand: resolved.brand,
  };
}

/**
 * Finds a resolved item by fuzzy name matching
 */
export function findItemByName(
  items: ResolvedNutrition[],
  searchName: string
): ResolvedNutrition | undefined {
  const lowerSearch = searchName.toLowerCase().trim();

  // Exact match first
  let match = items.find(item => item.name.toLowerCase() === lowerSearch);
  if (match) return match;

  // Partial match (search term is in item name)
  match = items.find(item => item.name.toLowerCase().includes(lowerSearch));
  if (match) return match;

  // Reverse partial match (item name is in search term)
  match = items.find(item => lowerSearch.includes(item.name.toLowerCase()));
  if (match) return match;

  return undefined;
}
