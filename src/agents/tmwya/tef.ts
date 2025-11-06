import type { MealTotals, TefBreakdown } from "../shared/nutrition/types";

export type TEFConfig = {
  protein_rate?: number; // default 0.30
  carbs_rate?: number;   // default 0.12
  fat_rate?: number;     // default 0.02
};

function round1(n: number) { return Math.max(0, Math.round(n * 10) / 10); }

/**
 * TEF uses: Protein 30%, Carbs 12%, Fat 2%.
 * Carbs include fiber; do not compute fiber separately.
 */
export function computeTEF(totals: MealTotals, cfg: TEFConfig = {}): TefBreakdown {
  const pr = cfg.protein_rate ?? 0.30;
  const cr = cfg.carbs_rate  ?? 0.12;
  const fr = cfg.fat_rate    ?? 0.02;

  const pKcal = totals.protein_g * 4 * pr;
  const cKcal = totals.carbs_g   * 4 * cr; // fiber is included in carbs_g
  const fKcal = totals.fat_g     * 9 * fr;

  const by_macro = {
    protein: round1(pKcal),
    carbs:   round1(cKcal),
    fat:     round1(fKcal)
  };
  return { kcal: round1(by_macro.protein + by_macro.carbs + by_macro.fat), by_macro };
}


