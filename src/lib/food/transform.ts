import { SimplifiedNormalizedMealData, SimplifiedSaveMealInput, MealSlot } from '../../types/food';

const DEFAULT_SLOT: MealSlot = null;
const nowIso = () => new Date().toISOString();

/**
 * Convert verification payload → exact SaveMealInput shape the RPC expects
 *
 * This transformer ensures meal_slot and ts are always defined,
 * preventing undefined errors in the save flow.
 */
export function toSaveMealInput(
  n: SimplifiedNormalizedMealData,
  source: SimplifiedSaveMealInput['source']
): SimplifiedSaveMealInput {
  return {
    ts: n.ts ?? nowIso(),
    meal_slot: n.meal_slot ?? DEFAULT_SLOT,
    source,
    totals: {
      kcal: Number(n.totals.kcal ?? 0),
      protein_g: Number(n.totals.protein_g ?? 0),
      fat_g: Number(n.totals.fat_g ?? 0),
      carbs_g: Number(n.totals.carbs_g ?? 0),
      fiber_g: Number(n.totals.fiber_g ?? 0),
      assumptions: n.totals.assumptions ?? [],
    },
    items: (n.items ?? []).map(it => ({
      name: it.name,
      quantity: Number(it.quantity ?? 0),
      unit: it.unit ?? 'serving',
      macros: {
        kcal: Number(it.macros?.kcal ?? 0),
        protein_g: Number(it.macros?.protein_g ?? 0),
        fat_g: Number(it.macros?.fat_g ?? 0),
        carbs_g: Number(it.macros?.carbs_g ?? 0),
        fiber_g: Number(it.macros?.fiber_g ?? 0),
      },
    })),
  };
}
