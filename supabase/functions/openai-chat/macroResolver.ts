import { createClient } from 'jsr:@supabase/supabase-js@2';
import type { V1FoodItem, MacroTotals } from '../../../src/types/foodlog.ts';

export interface MacroResolutionResult {
  ok: boolean;
  items: V1FoodItem[];
  totals: MacroTotals;
  cacheHits: number;
  dbLookups: number;
  error?: string;
}

/**
 * Resolve macros for all items in a meal
 * Priority: 1) Food cache, 2) User preferences, 3) Database lookup, 4) LLM estimation
 */
export async function resolveMacros(
  items: V1FoodItem[],
  userId: string
): Promise<MacroResolutionResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let cacheHits = 0;
  let dbLookups = 0;
  const resolvedItems: V1FoodItem[] = [];

  for (const item of items) {
    // Skip if macros already present
    if (item.macros && item.macros.calories > 0) {
      resolvedItems.push(item);
      continue;
    }

    // Try cache lookup first
    const cached = await lookupFoodCache(supabase, item);
    if (cached) {
      cacheHits++;
      resolvedItems.push({ ...item, macros: cached });
      continue;
    }

    // Try user preference lookup
    const preferred = await lookupUserPreference(supabase, userId, item);
    if (preferred) {
      resolvedItems.push({ ...item, macros: preferred });
      continue;
    }

    // Try database lookup
    const dbResult = await lookupDatabase(supabase, item);
    if (dbResult) {
      dbLookups++;
      resolvedItems.push({ ...item, macros: dbResult });

      // Cache the result for future
      await cacheFoodEntry(supabase, item, dbResult);
      continue;
    }

    // Fallback: keep item without macros (will trigger clarification)
    resolvedItems.push(item);
  }

  // Calculate totals
  const totals = calculateTotals(resolvedItems);

  return {
    ok: true,
    items: resolvedItems,
    totals,
    cacheHits,
    dbLookups,
  };
}

/**
 * Lookup food in cache
 */
async function lookupFoodCache(
  supabase: any,
  item: V1FoodItem
): Promise<MacroTotals | null> {
  try {
    const { data, error } = await supabase
      .from('food_cache')
      .select('macros, micros, grams_per_serving')
      .ilike('name', `%${item.name}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    // Scale macros based on quantity
    const servingRatio = item.quantity || 1;
    return {
      calories: (data.macros.kcal || 0) * servingRatio,
      protein: (data.macros.protein_g || 0) * servingRatio,
      carbs: (data.macros.carbs_g || 0) * servingRatio,
      fat: (data.macros.fat_g || 0) * servingRatio,
      fiber: (data.micros?.fiber_g || 0) * servingRatio,
    };
  } catch (err) {
    console.error('[macroResolver] Cache lookup error:', err);
    return null;
  }
}

/**
 * Lookup user's food terminology preferences
 */
async function lookupUserPreference(
  supabase: any,
  userId: string,
  item: V1FoodItem
): Promise<MacroTotals | null> {
  try {
    const { data, error } = await supabase
      .from('user_food_preferences')
      .select('resolved_to')
      .eq('user_id', userId)
      .ilike('term_used', item.name)
      .maybeSingle();

    if (error || !data) return null;

    // Look up the resolved food in cache
    const resolvedItem = { ...item, name: data.resolved_to };
    return await lookupFoodCache(supabase, resolvedItem);
  } catch (err) {
    console.error('[macroResolver] User preference lookup error:', err);
    return null;
  }
}

/**
 * Lookup food in nutrition database
 */
async function lookupDatabase(
  supabase: any,
  item: V1FoodItem
): Promise<MacroTotals | null> {
  // This would integrate with USDA/OpenFoodFacts/other DBs
  // For now, return null (cache-only in v1)
  return null;
}

/**
 * Cache food entry for future lookups
 */
async function cacheFoodEntry(
  supabase: any,
  item: V1FoodItem,
  macros: MacroTotals
): Promise<void> {
  try {
    const cacheId = `${item.name.toLowerCase().replace(/\s+/g, '_')}:${item.brand || 'generic'}:${item.unit}`;

    await supabase.from('food_cache').upsert(
      {
        id: cacheId,
        name: item.name,
        brand: item.brand,
        serving_size: `${item.quantity} ${item.unit}`,
        grams_per_serving: 100, // Default
        macros: {
          kcal: macros.calories,
          protein_g: macros.protein,
          carbs_g: macros.carbs,
          fat_g: macros.fat,
        },
        micros: {
          fiber_g: macros.fiber || 0,
        },
        source_db: 'manual',
        confidence: 0.8,
        access_count: 1,
        last_accessed: new Date().toISOString(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.error('[macroResolver] Cache write error:', err);
  }
}

/**
 * Calculate totals from resolved items
 */
export function calculateTotals(items: V1FoodItem[]): MacroTotals {
  const totals: MacroTotals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  for (const item of items) {
    if (item.macros) {
      totals.calories += item.macros.calories || 0;
      totals.protein += item.macros.protein || 0;
      totals.carbs += item.macros.carbs || 0;
      totals.fat += item.macros.fat || 0;
      totals.fiber += item.macros.fiber || 0;
    }
  }

  // Round to 1 decimal place
  totals.calories = Math.round(totals.calories * 10) / 10;
  totals.protein = Math.round(totals.protein * 10) / 10;
  totals.carbs = Math.round(totals.carbs * 10) / 10;
  totals.fat = Math.round(totals.fat * 10) / 10;
  totals.fiber = Math.round(totals.fiber * 10) / 10;

  return totals;
}

/**
 * Format item list for conversational response
 */
export function formatItemsForMessage(items: V1FoodItem[]): string {
  if (items.length === 0) return 'nothing';
  if (items.length === 1) {
    const item = items[0];
    return `${item.quantity} ${item.unit} ${item.name}`;
  }

  return items
    .map((item) => `${item.quantity} ${item.unit} ${item.name}`)
    .join(', ');
}
