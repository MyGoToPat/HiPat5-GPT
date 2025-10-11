/**
 * KPI Intent Handler (Swarm 2.1)
 * Calculates remaining macros using TEF-adjusted math (matches Profile/Dashboard)
 * Timezone-aware day boundaries
 */

import { getSupabase } from '../supabase';
import { todayBounds } from '../time/dateRange';

export interface KPIQuestionResult {
  ok: boolean;
  reply: string;
  error?: string;
}

/**
 * Handle kpi_question intent - "how much do I have left today?"
 * Uses Net Daily Target (TEF-adjusted) matching Profile/Dashboard math
 */
export async function handleKpiQuestion(
  userId: string,
  timezone: string
): Promise<KPIQuestionResult> {
  const supabase = getSupabase();

  try {
    // 1. Get user targets from user_metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('user_metrics')
      .select('tdee, protein_g, carbs_g, fat_g, fiber_g_target, manual_macro_override')
      .eq('user_id', userId)
      .maybeSingle();

    if (metricsError) {
      console.error('[handleKpiQuestion] Error fetching user_metrics:', metricsError);
      return {
        ok: false,
        reply: 'Unable to fetch your nutrition targets.',
        error: metricsError.message
      };
    }

    if (!metrics) {
      return {
        ok: false,
        reply: 'Please complete your TDEE onboarding to see remaining macros.',
        error: 'No user_metrics found'
      };
    }

    // 2. Extract macro targets (handle null/undefined gracefully)
    const P = metrics.protein_g ?? 0;
    const C = metrics.carbs_g ?? 0;
    const F = metrics.fat_g ?? 0;
    const fiberTarget = metrics.fiber_g_target; // May be null

    // 3. Compute Net Daily Target (TEF-adjusted) - matches Profile math
    const macroCalories = P * 4 + C * 4 + F * 9;
    const tef = P * 4 * 0.30 + C * 4 * 0.12 + F * 9 * 0.02;
    const netDailyTarget = macroCalories - tef;

    // 4. Get today's consumption (timezone-aware bounds)
    const { startISO, endISO } = todayBounds(timezone);

    // Two-step query to avoid relationship metadata issues
    // Step 1: Get meal_log ids for today
    const { data: logs, error: logsError } = await supabase
      .from('meal_logs')
      .select('id')
      .eq('user_id', userId)
      .gte('ts', startISO)
      .lte('ts', endISO);

    if (logsError) {
      console.error('[handleKpiQuestion] Error fetching meal_logs:', logsError);
      return {
        ok: false,
        reply: 'Unable to fetch today\'s meals.',
        error: logsError.message
      };
    }

    const logIds = (logs ?? []).map(l => l.id);

    // Initialize consumed totals
    let consumed = {
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };

    // Step 2: Fetch meal_items for those logs (if any)
    if (logIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('meal_items')
        .select('energy_kcal, protein_g, carbs_g, fat_g, fiber_g')
        .in('meal_log_id', logIds);

      if (itemsError) {
        console.error('[handleKpiQuestion] Error fetching meal_items:', itemsError);
        return {
          ok: false,
          reply: 'Unable to calculate today\'s consumption.',
          error: itemsError.message
        };
      }

      // Sum up consumed nutrients
      consumed = (items ?? []).reduce((acc, item) => ({
        kcal: acc.kcal + (item.energy_kcal ?? 0),
        protein: acc.protein + (item.protein_g ?? 0),
        carbs: acc.carbs + (item.carbs_g ?? 0),
        fat: acc.fat + (item.fat_g ?? 0),
        fiber: acc.fiber + (item.fiber_g ?? 0)
      }), consumed);
    }

    // 5. Calculate consumed TEF
    const consumedTEF =
      consumed.protein * 4 * 0.30 +
      consumed.carbs * 4 * 0.12 +
      consumed.fat * 9 * 0.02;

    const consumedNet = consumed.kcal - consumedTEF;

    // 6. Calculate remaining (clip at 0 for readability)
    const remainingKcal = Math.max(0, Math.round(netDailyTarget - consumedNet));
    const remainingProtein = Math.max(0, Math.round(P - consumed.protein));
    const remainingCarbs = Math.max(0, Math.round(C - consumed.carbs));
    const remainingFat = Math.max(0, Math.round(F - consumed.fat));

    // 7. Build reply
    let reply = `You have ${remainingKcal} kcal left • ${remainingProtein}g Protein • ${remainingFat}g Fat • ${remainingCarbs}g Carbs`;

    // Only include fiber if target exists
    if (fiberTarget != null && fiberTarget > 0) {
      const remainingFiber = Math.max(0, Math.round(fiberTarget - consumed.fiber));
      reply += ` • ${remainingFiber}g Fiber`;
    }

    return {
      ok: true,
      reply
    };

  } catch (error: any) {
    console.error('[handleKpiQuestion] Unexpected error:', error);
    return {
      ok: false,
      reply: 'An error occurred while calculating your remaining macros.',
      error: error.message || 'Unexpected error'
    };
  }
}
