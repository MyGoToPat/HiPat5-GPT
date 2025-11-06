/**
 * Generic Provider
 * Fallback for non-branded items using food_cache database
 */

import type { MacroProvider, MacroResult, NormalizedItem } from './types';
import { getSupabase } from '../../../../lib/supabase';

/**
 * Convert quantity + unit to grams
 */
function convertToGrams(qty: number, unit: string, foodName: string): number {
  const unitLower = unit.toLowerCase();
  const foodNameLower = foodName.toLowerCase();

  // Special cases based on food name
  if (unitLower === 'large' && foodNameLower.includes('egg')) return qty * 50;
  if ((unitLower === 'slice' || unitLower === 'slices') && foodNameLower.includes('bacon')) return qty * 10;
  if ((unitLower === 'slice' || unitLower === 'slices') && (foodNameLower.includes('bread') || foodNameLower.includes('sourdough'))) return qty * 50;

  // Weight-based units
  const conversions: Record<string, number> = {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'oz': 28.35,
    'ounce': 28.35,
    'ounces': 28.35,
    'lb': 453.59,
    'pound': 453.59,
    'pounds': 453.59,
    'kg': 1000,
    // Volume (approximate for solids)
    'cup': 240,
    'cups': 240,
    'tbsp': 15,
    'tablespoon': 15,
    'tsp': 5,
    'teaspoon': 5,
    // Count-based defaults
    'serving': 100,
    'piece': 100,
    'item': 100,
  };

  return (conversions[unitLower] || 100) * qty;
}

/**
 * Normalize food name with USDA synonyms
 * Only normalize when no brand is present to avoid breaking branded hits
 */
function normalizeFoodName(name: string, brand?: string | null): string {
  // Skip normalization for branded items
  if (brand) {
    return name;
  }
  
  const lower = name.toLowerCase().trim();
  
  // New York steak synonyms → strip loin / strip steak
  if (/new\s*york|ny\s*strip|striploin|top\s*loin|strip\s*loin/.test(lower)) {
    return 'beef strip loin'; // USDA common name
  }
  
  // Sourdough bread synonyms
  if (/sourdough/.test(lower) && /bread|slice/.test(lower)) {
    return 'bread sourdough'; // USDA common name
  }
  
  return name; // No change
}

export const genericProvider: MacroProvider = {
  id: 'generic',
  priority: 3, // Lowest priority (fallback)
  
  supports(): boolean {
    return true; // Always supports (fallback)
  },
  
  async fetch(item: NormalizedItem, userId?: string): Promise<MacroResult | null> {
    // Get user's country preference
    let country = 'us';
    if (userId) {
      try {
        const supabase = getSupabase();
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('country_code')
          .eq('user_id', userId)
          .maybeSingle();
        country = prefs?.country_code?.toLowerCase() || 'us';
      } catch (err) {
        console.warn('[generic] Failed to fetch country preference:', err);
      }
    }
    
    // ✅ Normalize food name with synonyms (only if no brand)
    const normalizedName = normalizeFoodName(item.name, item.brand);
    
    // Query food_cache with country-aware fallback
    const supabase = getSupabase();
    
    // First try: exact match with country
    let query = supabase
      .from('food_cache')
      .select('id, name, macros, micros, grams_per_serving, serving_size, brand, country_code')
      .ilike('name', `%${normalizedName}%`)
      .order('confidence', { ascending: false })
      .limit(1);
    
    // Prioritize country-specific entries
    const { data: countryData } = await query
      .eq('country_code', country.toUpperCase())
      .maybeSingle();
    
    if (countryData && countryData.macros) {
      return convertToMacroResult(countryData, item);
    }
    
    // Fallback: generic entries (country_code IS NULL)
    const { data: genericData } = await query
      .is('country_code', null)
      .maybeSingle();
    
    if (genericData && genericData.macros) {
      return convertToMacroResult(genericData, item);
    }

    // ✅ Return null to let cascade continue (no stub masking)
    console.log(`[generic] No data found for "${item.name}" (normalized: "${normalizedName}"), trying next provider`);
    return null;
  }
};

/**
 * Convert database row to MacroResult with quantity scaling
 */
function convertToMacroResult(dbRow: any, item: NormalizedItem): MacroResult {
  const micros = dbRow.micros || {};
  const gramsPerServing = dbRow.grams_per_serving || 100;
  
  // Convert user's quantity+unit to grams
  const qty = item.amount ?? 1;
  const userGrams = item.unit ? convertToGrams(qty, item.unit, item.name) : qty * gramsPerServing;
  const multiplier = userGrams / gramsPerServing;
  
  return {
    name: item.name,
    serving_label: dbRow.serving_size || 'serving',
    grams_per_serving: gramsPerServing,
    macros: {
      kcal: (dbRow.macros.kcal || 0) * multiplier,
      protein_g: (dbRow.macros.protein_g || 0) * multiplier,
      carbs_g: (dbRow.macros.carbs_g || 0) * multiplier,
      fat_g: (dbRow.macros.fat_g || 0) * multiplier,
      fiber_g: (micros.fiber_g || 0) * multiplier
    },
    confidence: dbRow.confidence || 0.8,
    source: 'generic'
  };
}

export async function lookup(normalized: any, userId?: string) {
  return await genericProvider.fetch?.(normalized, userId);
}

