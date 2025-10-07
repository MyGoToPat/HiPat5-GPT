/**
 * Shared Portion Resolver
 * Single source of truth for converting count units to grams
 * Fetches defaults from public.food_unit_defaults table
 */

import { getSupabase } from '../lib/supabase';
import type { MealParse, MealItem } from './meal-nlu';

export interface PortionedItem extends MealItem {
  grams_used: number;
  basis: string;
}

export interface MealParsePortioned {
  items: PortionedItem[];
  meal_slot?: string | null;
}

// In-memory cache for portion defaults (loaded once per session)
let portionDefaultsCache: Map<string, { grams: number; basis: string }> | null = null;

/**
 * Load portion defaults from database
 */
async function loadPortionDefaults(): Promise<Map<string, { grams: number; basis: string }>> {
  if (portionDefaultsCache) {
    return portionDefaultsCache;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('food_unit_defaults')
    .select('food_key, grams, basis');

  if (error) {
    console.warn('[portion-resolver] Failed to load defaults:', error);
    // Return hardcoded fallback
    return getHardcodedDefaults();
  }

  const cache = new Map<string, { grams: number; basis: string }>();
  data?.forEach(row => {
    cache.set(row.food_key, { grams: row.grams, basis: row.basis });
  });

  portionDefaultsCache = cache;
  return cache;
}

/**
 * Hardcoded fallback defaults (matches SQL seed data)
 */
function getHardcodedDefaults(): Map<string, { grams: number; basis: string }> {
  return new Map([
    ['bacon.slice_cooked', { grams: 10, basis: 'cooked' }],
    ['bread.slice', { grams: 40, basis: 'cooked' }],
    ['bread.sourdough.slice', { grams: 50, basis: 'cooked' }],
    ['egg.large', { grams: 50, basis: 'cooked' }],
    ['cheese.slice', { grams: 23, basis: 'cooked' }],
    ['rice.cup_cooked', { grams: 158, basis: 'cooked' }],
    ['chicken.breast_default', { grams: 170, basis: 'cooked' }],
    ['steak.default', { grams: 227, basis: 'cooked' }]
  ]);
}

/**
 * Convert oz to grams
 */
function ozToGrams(oz: number): number {
  return oz * 28.35;
}

/**
 * Resolve portions for all items in a meal parse
 * @param mealParse Output from meal-nlu
 * @returns Items with grams_used and basis fields
 */
export async function resolvePortions(mealParse: MealParse): Promise<MealParsePortioned> {
  const defaults = await loadPortionDefaults();
  const portionedItems: PortionedItem[] = [];

  for (const item of mealParse.items) {
    let grams_used: number;
    let basis = 'cooked'; // Default basis

    const unit = item.unit?.toLowerCase().trim();
    const name = item.name.toLowerCase();

    // Priority 1: Explicit grams from user
    if (unit === 'g' || unit === 'gram' || unit === 'grams') {
      grams_used = item.qty;
      portionedItems.push({ ...item, grams_used, basis });
      continue;
    }

    // Priority 2: Explicit oz from user
    if (unit === 'oz' || unit === 'ounce' || unit === 'ounces') {
      grams_used = ozToGrams(item.qty);
      portionedItems.push({ ...item, grams_used, basis });
      continue;
    }

    // Priority 3: Count units with food-specific defaults
    if (unit === 'slice' || unit === 'slices') {
      if (name.includes('bacon')) {
        const def = defaults.get('bacon.slice_cooked') || { grams: 10, basis: 'cooked' };
        grams_used = item.qty * def.grams;
        basis = def.basis;
      } else if (name.includes('sourdough')) {
        const def = defaults.get('bread.sourdough.slice') || { grams: 50, basis: 'cooked' };
        grams_used = item.qty * def.grams;
        basis = def.basis;
      } else if (name.includes('bread') || name.includes('toast')) {
        const def = defaults.get('bread.slice') || { grams: 40, basis: 'cooked' };
        grams_used = item.qty * def.grams;
        basis = def.basis;
      } else if (name.includes('cheese')) {
        const def = defaults.get('cheese.slice') || { grams: 23, basis: 'cooked' };
        grams_used = item.qty * def.grams;
        basis = def.basis;
      } else {
        // Generic slice
        grams_used = item.qty * 30;
      }
      portionedItems.push({ ...item, grams_used, basis });
      continue;
    }

    if (unit === 'large' || (name.includes('egg') && !unit)) {
      const def = defaults.get('egg.large') || { grams: 50, basis: 'cooked' };
      grams_used = item.qty * def.grams;
      basis = def.basis;
      portionedItems.push({ ...item, grams_used, basis });
      continue;
    }

    if (unit === 'cup' || unit === 'cup_cooked') {
      if (name.includes('rice')) {
        const def = defaults.get('rice.cup_cooked') || { grams: 158, basis: 'cooked' };
        grams_used = item.qty * def.grams;
        basis = def.basis;
      } else {
        // Generic cup
        grams_used = item.qty * 240;
      }
      portionedItems.push({ ...item, grams_used, basis });
      continue;
    }

    // Priority 4: Generic protein defaults
    if (name.includes('chicken') && (unit === 'breast' || unit === 'serving' || !unit)) {
      const def = defaults.get('chicken.breast_default') || { grams: 170, basis: 'cooked' };
      grams_used = item.qty * def.grams;
      basis = def.basis;
      portionedItems.push({ ...item, grams_used, basis });
      continue;
    }

    if ((name.includes('steak') || name.includes('ribeye') || name.includes('sirloin')) && (unit === 'serving' || !unit)) {
      const def = defaults.get('steak.default') || { grams: 227, basis: 'cooked' };
      grams_used = item.qty * def.grams;
      basis = def.basis;
      portionedItems.push({ ...item, grams_used, basis });
      continue;
    }

    // Priority 5: Generic fallback
    if (unit === 'serving' || !unit) {
      grams_used = item.qty * 100; // 100g generic serving
    } else {
      // Unknown unit, use 100g per qty
      grams_used = item.qty * 100;
    }

    portionedItems.push({ ...item, grams_used, basis });
  }

  return {
    items: portionedItems,
    meal_slot: mealParse.meal_slot
  };
}
