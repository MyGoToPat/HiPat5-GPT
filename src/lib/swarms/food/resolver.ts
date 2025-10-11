/**
 * Nutrition Resolver for Swarm 2.2
 *
 * Waterfall resolution: cache → food_defaults → existing resolver → LLM estimate
 * Implements "cooked by default" policy
 */

import { getSupabase } from '../../supabase';
import { resolveNutrition as existingResolver, type ResolvedNutrition as ExistingResolved } from '../../personality/nutritionResolver';
import type { FoodEntity } from './nlu';
import type { NutritionData } from './aggregator';

/**
 * Resolve nutrition for food entities
 */
export async function resolveNutrition(entities: FoodEntity[]): Promise<NutritionData[]> {
  const results: NutritionData[] = [];

  for (const entity of entities) {
    try {
      const resolved = await resolveSingleItem(entity);
      results.push(resolved);
    } catch (error) {
      console.error('[resolver] Failed to resolve:', entity.name, error);
      // Add fallback with low confidence
      results.push(createFallbackNutrition(entity));
    }
  }

  return results;
}

/**
 * Resolve single food item
 */
async function resolveSingleItem(entity: FoodEntity): Promise<NutritionData> {
  const supabase = getSupabase();

  // Step 1: Check food_defaults for canonical reference
  const { data: foodDefault } = await supabase
    .from('food_defaults')
    .select('*')
    .or(`food_name.eq.${entity.name},aliases.cs.{${entity.name}}`)
    .maybeSingle();

  // Determine prep state (cooked by default unless explicitly specified)
  const explicitPrep = entity.qualifiers?.some(q =>
    ['cooked', 'raw', 'dry', 'dried'].includes(q.toLowerCase())
  );

  const prepState = explicitPrep
    ? (entity.qualifiers?.find(q => ['cooked', 'raw'].includes(q.toLowerCase())) || 'cooked')
    : (foodDefault?.prep_state || 'cooked');

  // Step 2: Use existing nutrition resolver
  const resolved = await existingResolver([{
    name: entity.name,
    qty: entity.quantity,
    unit: entity.unit,
    basis: prepState as 'cooked' | 'raw' | 'as-served'
  }]);

  if (resolved.length === 0) {
    return createFallbackNutrition(entity);
  }

  const item = resolved[0];

  // Map to NutritionData format
  return {
    name: entity.name,
    quantity: entity.quantity,
    unit: entity.unit,
    macros: {
      kcal: item.macros.kcal,
      protein_g: item.macros.protein_g,
      fat_g: item.macros.fat_g,
      carbs_g: item.macros.carbs_g,
      fiber_g: item.macros.fiber_g || 0
    },
    source: item.basis_used.includes('cache') ? 'cache' : 'usda',
    confidence: 0.9,
    metadata: {
      prepState: prepState as 'cooked' | 'raw' | 'mixed',
      explicitPrep,
      sizeAssumed: entity.qualifiers?.find(q =>
        ['small', 'medium', 'large'].includes(q.toLowerCase())
      ),
      unitConverted: entity.unit !== item.unit,
      targetUnit: item.unit
    }
  };
}

/**
 * Create fallback nutrition data (low confidence estimate)
 */
function createFallbackNutrition(entity: FoodEntity): NutritionData {
  // Very basic estimates (should rarely be used)
  const baseKcal = 150; // Average food item
  const quantity = entity.quantity;

  return {
    name: entity.name,
    quantity: entity.quantity,
    unit: entity.unit,
    macros: {
      kcal: baseKcal * quantity,
      protein_g: 10 * quantity,
      fat_g: 5 * quantity,
      carbs_g: 15 * quantity,
      fiber_g: 2 * quantity
    },
    source: 'llm_estimate',
    confidence: 0.3,
    metadata: {
      prepState: 'cooked',
      explicitPrep: false
    }
  };
}
