import { getSupabase } from './supabase';

export interface WeeklyData {
  week_start_date: string;
  week_end_date: string;
  frequency_score: number;
  rest_score: number;
  energy_score: number;
  effort_score: number;
  composite_score: number;
  sessions_count: number;
  avg_sleep_hours: number;
  avg_calories: number;
  total_volume_lbs: number;
  avg_protein_g: number;
  avg_carbs_g: number;
  avg_fat_g: number;
  state: 'growth' | 'plateau' | 'regression';
}

export interface MonthlyData {
  month: string;
  year: number;
  month_start_date: string;
  month_end_date: string;
  avg_frequency_score: number;
  avg_rest_score: number;
  avg_energy_score: number;
  avg_effort_score: number;
  avg_composite_score: number;
  total_sessions: number;
  avg_sleep_hours: number;
  avg_calories: number;
  total_volume_lbs: number;
  avg_protein_g: number;
  avg_carbs_g: number;
  avg_fat_g: number;
  days_with_data: number;
  goal_adherence_pct: number;
}

export interface DayRollup {
  date: string;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    tef_kcal?: number;
    net_kcal?: number;
  };
  targets?: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  meal_count: number;
}

export async function getWeekBoundaries(userId: string, date?: Date): Promise<{ week_start: string; week_end: string } | null> {
  const supabase = getSupabase();
  const targetDate = date ? date.toISOString().split('T')[0] : null;

  const { data, error } = await supabase.rpc('get_user_week_boundaries', {
    p_user_id: userId,
    p_date: targetDate
  });

  if (error) {
    console.error('Error getting week boundaries:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  return {
    week_start: data[0].week_start,
    week_end: data[0].week_end
  };
}

export async function getMonthBoundaries(date?: Date): Promise<{ month_start: string; month_end: string } | null> {
  const supabase = getSupabase();
  const targetDate = date ? date.toISOString().split('T')[0] : null;

  const { data, error } = await supabase.rpc('get_calendar_month_boundaries', {
    p_date: targetDate
  });

  if (error) {
    console.error('Error getting month boundaries:', error);
    return null;
  }

  if (!data || data.length === 0) return null;

  return {
    month_start: data[0].month_start,
    month_end: data[0].month_end
  };
}

export async function getWeeklyData(userId: string, weeksBack: number = 12): Promise<WeeklyData[]> {
  const supabase = getSupabase();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (weeksBack * 7));

  const { data: dayRollups, error: dayError } = await supabase
    .from('day_rollups')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (dayError) {
    console.error('Error fetching day rollups:', dayError);
    return [];
  }

  const { data: workoutLogs, error: workoutError } = await supabase
    .from('workout_logs')
    .select('workout_date, duration_minutes, volume_lbs, avg_rpe')
    .eq('user_id', userId)
    .gte('workout_date', startDate.toISOString().split('T')[0])
    .lte('workout_date', endDate.toISOString().split('T')[0])
    .order('workout_date', { ascending: true });

  if (workoutError) {
    console.error('Error fetching workout logs:', workoutError);
  }

  const { data: sleepLogs, error: sleepError } = await supabase
    .from('sleep_logs')
    .select('sleep_date, duration_minutes, quality_score')
    .eq('user_id', userId)
    .gte('sleep_date', startDate.toISOString().split('T')[0])
    .lte('sleep_date', endDate.toISOString().split('T')[0])
    .order('sleep_date', { ascending: true });

  if (sleepError) {
    console.error('Error fetching sleep logs:', sleepError);
  }

  const weeklyMap = new Map<string, WeeklyData>();

  for (const rollup of dayRollups || []) {
    const boundaries = await getWeekBoundaries(userId, new Date(rollup.date));
    if (!boundaries) continue;

    const weekKey = boundaries.week_start;

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, {
        week_start_date: boundaries.week_start,
        week_end_date: boundaries.week_end,
        frequency_score: 0,
        rest_score: 0,
        energy_score: 0,
        effort_score: 0,
        composite_score: 0,
        sessions_count: 0,
        avg_sleep_hours: 0,
        avg_calories: 0,
        total_volume_lbs: 0,
        avg_protein_g: 0,
        avg_carbs_g: 0,
        avg_fat_g: 0,
        state: 'plateau'
      });
    }

    const weekData = weeklyMap.get(weekKey)!;
    weekData.avg_calories += rollup.totals?.kcal || 0;
    weekData.avg_protein_g += rollup.totals?.protein_g || 0;
    weekData.avg_carbs_g += rollup.totals?.carbs_g || 0;
    weekData.avg_fat_g += rollup.totals?.fat_g || 0;
  }

  for (const workout of workoutLogs || []) {
    const boundaries = await getWeekBoundaries(userId, new Date(workout.workout_date));
    if (!boundaries) continue;

    const weekKey = boundaries.week_start;
    const weekData = weeklyMap.get(weekKey);
    if (weekData) {
      weekData.sessions_count++;
      weekData.total_volume_lbs += workout.volume_lbs || 0;
    }
  }

  for (const sleep of sleepLogs || []) {
    const boundaries = await getWeekBoundaries(userId, new Date(sleep.sleep_date));
    if (!boundaries) continue;

    const weekKey = boundaries.week_start;
    const weekData = weeklyMap.get(weekKey);
    if (weekData) {
      weekData.avg_sleep_hours += (sleep.duration_minutes || 0) / 60;
    }
  }

  const weeklyData = Array.from(weeklyMap.values());

  for (const week of weeklyData) {
    const daysInWeek = 7;
    week.avg_calories = week.avg_calories / daysInWeek;
    week.avg_protein_g = week.avg_protein_g / daysInWeek;
    week.avg_carbs_g = week.avg_carbs_g / daysInWeek;
    week.avg_fat_g = week.avg_fat_g / daysInWeek;
    week.avg_sleep_hours = week.avg_sleep_hours / daysInWeek;

    week.frequency_score = Math.min(100, (week.sessions_count / 5) * 100);
    week.rest_score = Math.min(100, (week.avg_sleep_hours / 8) * 100);
    week.energy_score = week.avg_calories > 0 ? 75 : 0;
    week.effort_score = week.total_volume_lbs > 0 ? 70 : 0;
    week.composite_score = (week.frequency_score + week.rest_score + week.energy_score + week.effort_score) / 4;
  }

  return weeklyData.sort((a, b) => a.week_start_date.localeCompare(b.week_start_date));
}

export async function getMonthlyData(userId: string, monthsBack: number = 6): Promise<MonthlyData[]> {
  const supabase = getSupabase();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - monthsBack);
  startDate.setDate(1);

  const { data: dayRollups, error: dayError } = await supabase
    .from('day_rollups')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (dayError) {
    console.error('Error fetching day rollups:', dayError);
    return [];
  }

  const { data: workoutLogs, error: workoutError } = await supabase
    .from('workout_logs')
    .select('workout_date, duration_minutes, volume_lbs, avg_rpe')
    .eq('user_id', userId)
    .gte('workout_date', startDate.toISOString().split('T')[0])
    .lte('workout_date', endDate.toISOString().split('T')[0])
    .order('workout_date', { ascending: true });

  if (workoutError) {
    console.error('Error fetching workout logs:', workoutError);
  }

  const { data: sleepLogs, error: sleepError } = await supabase
    .from('sleep_logs')
    .select('sleep_date, duration_minutes, quality_score')
    .eq('user_id', userId)
    .gte('sleep_date', startDate.toISOString().split('T')[0])
    .lte('sleep_date', endDate.toISOString().split('T')[0])
    .order('sleep_date', { ascending: true });

  if (sleepError) {
    console.error('Error fetching sleep logs:', sleepError);
  }

  const monthlyMap = new Map<string, MonthlyData>();

  for (const rollup of dayRollups || []) {
    const date = new Date(rollup.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const boundaries = await getMonthBoundaries(date);
    if (!boundaries) continue;

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: date.toLocaleString('default', { month: 'long' }),
        year: date.getFullYear(),
        month_start_date: boundaries.month_start,
        month_end_date: boundaries.month_end,
        avg_frequency_score: 0,
        avg_rest_score: 0,
        avg_energy_score: 0,
        avg_effort_score: 0,
        avg_composite_score: 0,
        total_sessions: 0,
        avg_sleep_hours: 0,
        avg_calories: 0,
        total_volume_lbs: 0,
        avg_protein_g: 0,
        avg_carbs_g: 0,
        avg_fat_g: 0,
        days_with_data: 0,
        goal_adherence_pct: 0
      });
    }

    const monthData = monthlyMap.get(monthKey)!;
    monthData.avg_calories += rollup.totals?.kcal || 0;
    monthData.avg_protein_g += rollup.totals?.protein_g || 0;
    monthData.avg_carbs_g += rollup.totals?.carbs_g || 0;
    monthData.avg_fat_g += rollup.totals?.fat_g || 0;
    monthData.days_with_data++;
  }

  for (const workout of workoutLogs || []) {
    const date = new Date(workout.workout_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const monthData = monthlyMap.get(monthKey);
    if (monthData) {
      monthData.total_sessions++;
      monthData.total_volume_lbs += workout.volume_lbs || 0;
    }
  }

  for (const sleep of sleepLogs || []) {
    const date = new Date(sleep.sleep_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    const monthData = monthlyMap.get(monthKey);
    if (monthData) {
      monthData.avg_sleep_hours += (sleep.duration_minutes || 0) / 60;
    }
  }

  const monthlyData = Array.from(monthlyMap.values());

  for (const month of monthlyData) {
    if (month.days_with_data > 0) {
      month.avg_calories = month.avg_calories / month.days_with_data;
      month.avg_protein_g = month.avg_protein_g / month.days_with_data;
      month.avg_carbs_g = month.avg_carbs_g / month.days_with_data;
      month.avg_fat_g = month.avg_fat_g / month.days_with_data;
      month.avg_sleep_hours = month.avg_sleep_hours / month.days_with_data;
    }

    const avgSessionsPerWeek = month.total_sessions / 4.33;
    month.avg_frequency_score = Math.min(100, (avgSessionsPerWeek / 5) * 100);
    month.avg_rest_score = Math.min(100, (month.avg_sleep_hours / 8) * 100);
    month.avg_energy_score = month.avg_calories > 0 ? 75 : 0;
    month.avg_effort_score = month.total_volume_lbs > 0 ? 70 : 0;
    month.avg_composite_score = (month.avg_frequency_score + month.avg_rest_score + month.avg_energy_score + month.avg_effort_score) / 4;
    month.goal_adherence_pct = (month.days_with_data / 30) * 100;
  }

  return monthlyData.sort((a, b) => {
    const dateA = new Date(a.month_start_date);
    const dateB = new Date(b.month_start_date);
    return dateA.getTime() - dateB.getTime();
  });
}
