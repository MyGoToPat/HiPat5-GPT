import type { PersonaContext, SentinelDelta } from './types';

// Compute deltas vs targets; PRD expects accurate surfacing after meals.
export function computeDeltas(ctx: PersonaContext): SentinelDelta | undefined {
  const day = new Date().toISOString().slice(0, 10);
  const t = ctx.dayTargets, u = ctx.dayTotals;
  if (!t || !u) return undefined;

  const delta: SentinelDelta = { day };
  if (t.calories !== undefined && u.calories !== undefined) delta.calories = { used: u.calories, target: t.calories };
  if (t.protein_g !== undefined && u.protein_g !== undefined) delta.protein = { gUsed: u.protein_g, gTarget: t.protein_g };
  if (t.fat_g !== undefined && u.fat_g !== undefined) delta.fat = { gUsed: u.fat_g, gTarget: t.fat_g };
  if (t.carbs_g !== undefined && u.carbs_g !== undefined) delta.carbs = { gUsed: u.carbs_g, gTarget: t.carbs_g };
  return delta;
}