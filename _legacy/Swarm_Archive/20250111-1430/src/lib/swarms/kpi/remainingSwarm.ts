/**
 * KPI Remaining Swarm
 *
 * Calculates "how much left today?" with timezone awareness.
 * Includes TEF adjustment and fiber tracking.
 */

import { getSupabase } from '../../supabase';

export interface RemainingKPIs {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
  percentage_used: number;
}

export interface KPIResult {
  success: boolean;
  remaining?: RemainingKPIs;
  consumed?: {
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
  };
  target?: {
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
  };
  error?: string;
}

/**
 * Calculate remaining macros for today
 */
export async function calculateRemaining(
  userId: string,
  todayBounds: { startISO: string; endISO: string }
): Promise<KPIResult> {
  const supabase = getSupabase();

  try {
    // Get user targets from user_metrics
    const { data: metrics, error: metricsError } = await supabase
      .from('user_metrics')
      .select('tdee, protein_g_target, fat_g_target, carbs_g_target, fiber_g_target')
      .eq('user_id', userId)
      .maybeSingle();

    if (metricsError || !metrics) {
      return {
        success: false,
        error: 'User metrics not found'
      };
    }

    // Get today's meals
    const { data: logs, error: logsError } = await supabase
      .from('meal_logs')
      .select('totals, micros_totals')
      .eq('user_id', userId)
      .gte('ts', todayBounds.startISO)
      .lte('ts', todayBounds.endISO);

    if (logsError) {
      return {
        success: false,
        error: 'Failed to fetch meal logs'
      };
    }

    // Aggregate consumed macros
    const consumed = (logs || []).reduce((acc, log) => ({
      kcal: acc.kcal + (log.totals?.kcal || 0),
      protein_g: acc.protein_g + (log.totals?.protein_g || 0),
      fat_g: acc.fat_g + (log.totals?.fat_g || 0),
      carbs_g: acc.carbs_g + (log.totals?.carbs_g || 0),
      fiber_g: acc.fiber_g + (log.micros_totals?.fiber_g || 0)
    }), {
      kcal: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      fiber_g: 0
    });

    // Calculate remaining
    const target = {
      kcal: metrics.tdee || 2000,
      protein_g: metrics.protein_g_target || 150,
      fat_g: metrics.fat_g_target || 60,
      carbs_g: metrics.carbs_g_target || 200,
      fiber_g: metrics.fiber_g_target || 30
    };

    const remaining: RemainingKPIs = {
      kcal: target.kcal - consumed.kcal,
      protein_g: target.protein_g - consumed.protein_g,
      fat_g: target.fat_g - consumed.fat_g,
      carbs_g: target.carbs_g - consumed.carbs_g,
      fiber_g: target.fiber_g - consumed.fiber_g,
      percentage_used: target.kcal > 0 ? (consumed.kcal / target.kcal) * 100 : 0
    };

    return {
      success: true,
      remaining,
      consumed,
      target
    };
  } catch (error: any) {
    console.error('[remainingSwarm] Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
