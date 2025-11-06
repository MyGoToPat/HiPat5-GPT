/**
 * Brand Map Provider
 * Fast lookup from curated brand servings map
 */

import type { MacroProvider, MacroResult, NormalizedItem } from './types';
import { buildBrandKey, BRAND_SERVINGS } from './brandServings';
import { getSupabase } from '../../../../lib/supabase';

export const brandMapProvider: MacroProvider = {
  id: 'brandMap',
  priority: 1, // Highest priority for branded items
  
  supports(item: NormalizedItem): boolean {
    return item.is_branded === true && !!item.brand;
  },
  
  async fetch(item: NormalizedItem, userId?: string): Promise<MacroResult | null> {
    if (!item.brand) return null;

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
        console.warn('[brandMap] Failed to fetch country preference, defaulting to US:', err);
      }
    }

    // Build normalized key - try multiple variations for better matching
    const keysToTry = [
      buildBrandKey(item.brand, item.name, item.serving_label, item.size_label, country),
      buildBrandKey(item.brand, item.name, item.serving_label, null, country),
      buildBrandKey(item.brand, item.name, null, item.size_label, country),
      buildBrandKey(item.brand, item.name, null, null, country)
    ];

    let entry = null;
    let matchedKey = '';

    for (const key of keysToTry) {
      if (BRAND_SERVINGS[key]) {
        entry = BRAND_SERVINGS[key];
        matchedKey = key;
        break;
      }
    }

    if (!entry) {
      // ✅ Return null to let cascade continue (no stub masking)
      console.log(`[brandMap] No brand entry found for "${item.name}" (tried ${keysToTry.length} variations), trying next provider`);
      return null;
    }
    
    // Scale by quantity
    const qty = item.amount ?? 1;
    
    return {
      name: item.name,
      serving_label: entry.serving_label,
      grams_per_serving: entry.grams_per_serving,
      macros: {
        kcal: entry.macros.kcal * qty,
        protein_g: entry.macros.protein_g * qty,
        carbs_g: entry.macros.carbs_g * qty,
        fat_g: entry.macros.fat_g * qty,
        fiber_g: entry.macros.fiber_g * qty
      },
      confidence: 0.95,
      source: 'brandMap'
    };
  }
};

export async function lookup(normalized: any, userId?: string) {
  return await brandMapProvider.fetch?.(normalized, userId);
}

