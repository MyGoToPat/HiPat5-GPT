import type { MealTotals, TefBreakdown, TdeeResult } from "../shared/nutrition/types";

function round1(n: number) { return Math.max(0, Math.round(n * 10) / 10); }

async function getTargetTDEE(supabase: any, userId: string): Promise<number> {
  const { calculateTargetCalories } = await import('../../lib/macros');

  const { data: metrics } = await supabase
    .from('user_metrics')
    .select('tdee, protein_g, carbs_g, fat_g, manual_macro_override, caloric_goal, caloric_adjustment')
    .eq('user_id', userId)
    .maybeSingle();

  if (metrics) {
    const protein = Number(metrics.protein_g ?? 0);
    const carbs = Number(metrics.carbs_g ?? 0);
    const fat = Number(metrics.fat_g ?? 0);
    const hasMacroTargets = protein > 0 && carbs > 0 && fat > 0;

    if (hasMacroTargets) {
      const macroCalories = Math.round((protein * 4) + (carbs * 4) + (fat * 9));
      if (macroCalories > 0) {
        return macroCalories;
      }
    }

    const derivedTarget = calculateTargetCalories(metrics);
    if (derivedTarget && derivedTarget > 0) {
      return derivedTarget;
    }

    if (metrics.tdee) {
      return Math.round(Number(metrics.tdee));
    }
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tdee_target')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.tdee_target) return Number(profile.tdee_target);

  return 2000; // Safe fallback for users without onboarding
}

async function getTodayUsage(supabase: any, userId: string, boundaries: any) {
  // Use meal_logs + meal_items (same as Dashboard - working!)
  const { data: items } = await supabase
    .from("meal_items")
    .select("energy_kcal, meal_log:meal_logs!inner(ts, user_id)")
    .eq("meal_log.user_id", userId)
    .gte("meal_log.ts", boundaries.day_start)
    .lte("meal_log.ts", boundaries.day_end);

  const used = (items ?? []).reduce((a: number, item: any) => a + Number(item.energy_kcal || 0), 0);
  const meals = items?.length || 0;
  return { used_kcal: used, meals_today: meals, last_meal_at: null };
}

export async function computeTDEE(
  userId: string,
  mealTotals: MealTotals,
  tef: TefBreakdown,
  _eatenAtIso: string // Unused, kept for API compatibility
): Promise<TdeeResult> {
  try {
    // Use getSupabase() from lib to avoid process.env in browser
    const { getSupabase, getUserDayBoundaries } = await import('../../../lib/supabase');
    const supabase = getSupabase();

    // Get day boundaries (same as Dashboard)
    const boundaries = await getUserDayBoundaries(userId);
    if (!boundaries) {
      console.warn("[tmwya.tdee] No boundaries, using safe fallback");
      return {
        target_kcal: 2000,
        used_kcal: 0,
        remaining_kcal: 2000,
        remaining_percentage: 100,
        meals_today: 0,
        last_meal_at: null,
        projection: { projected_total: 0, projected_remaining: 2000 }
      };
    }

    const target = await getTargetTDEE(supabase, userId);
    const today = await getTodayUsage(supabase, userId, boundaries);

    const thisMealKcal = round1(mealTotals.calories + tef.kcal);
    const used = round1(today.used_kcal + thisMealKcal);
    const remaining = Math.max(0, round1(target - used));
    
    // Clamp remaining_percentage to [0, 100] and guard NaN
    let remainingPct = target > 0 ? round1((remaining / target) * 100) : 0;
    if (isNaN(remainingPct) || !isFinite(remainingPct)) remainingPct = 0;
    remainingPct = Math.max(0, Math.min(100, remainingPct));

    const projected_total = Math.min(target, round1(used + 0)); // simple baseline
    const projected_remaining = Math.max(0, round1(target - projected_total));

    console.log("[tmwya.tdee] Computed:", { target, used: today.used_kcal, thisMeal: thisMealKcal, remaining });

    return {
      target_kcal: target,
      used_kcal: used,
      remaining_kcal: remaining,
      remaining_percentage: remainingPct,
      meals_today: today.meals_today + 1,
      last_meal_at: today.last_meal_at,
      projection: { projected_total, projected_remaining }
    };
  } catch (e) {
    console.error("[tmwya.tdee] compute error", e);
    return {
      target_kcal: 2000,
      used_kcal: 0,
      remaining_kcal: 2000,
      remaining_percentage: 100,
      meals_today: 0,
      last_meal_at: null,
      projection: { projected_total: 0, projected_remaining: 2000 }
    };
  }
}

