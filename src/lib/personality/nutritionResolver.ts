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
  };
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

  console.info('[nutrition-resolver:supabase-success]', {
    itemCount: resolved.length,
    duration: Date.now() - startTime,
    items: resolved.map((r: ResolvedNutrition) => ({
      name: r.name,
      grams_used: r.grams_used,
      basis_used: r.basis_used,
    })),
  });

  return resolved;
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

      items.push({
        name: name.trim(),
        qty,
        unit,
        basis: 'cooked',
      });
    }

    if (items.length > 0) break; // Found items, stop trying patterns
  }

  return items;
}
