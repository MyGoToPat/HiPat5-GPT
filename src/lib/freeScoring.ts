/**
 * FREE Scoring System
 * Calculates 0-100 scores for Frequency, Rest, Energy, and Effort
 */

interface WorkoutData {
  workout_date: string;
  duration_minutes: number;
  volume_lbs?: number;
  avg_rpe?: number;
}

interface SleepData {
  sleep_date: string;
  duration_minutes: number;
  quality_score?: number;
  deep_sleep_minutes?: number;
  rem_sleep_minutes?: number;
}

interface EnergyData {
  date: string;
  calories: number;
  target_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/**
 * Calculate Frequency Score (0-100)
 * Based on: session adherence, consistency streak, volume trends
 */
export function calculateFrequencyScore(
  workouts: WorkoutData[],
  weeklyGoal: number = 4
): { score: number; details: { adherence: number; consistency: number; volume: number } } {
  if (workouts.length === 0) {
    return { score: 0, details: { adherence: 0, consistency: 0, volume: 0 } };
  }

  // Get this week's workouts
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);

  const thisWeekWorkouts = workouts.filter(w => w.workout_date >= startOfWeekStr);

  // Adherence score (0-40 points) - sessions vs goal
  const adherenceRatio = Math.min(thisWeekWorkouts.length / weeklyGoal, 1);
  const adherenceScore = adherenceRatio * 40;

  // Consistency score (0-30 points) - regularity over time
  const uniqueDays = new Set(workouts.map(w => w.workout_date)).size;
  const daysSinceFirstWorkout = workouts.length > 0 ?
    Math.max(1, Math.floor((today.getTime() - new Date(workouts[0].workout_date).getTime()) / (1000 * 60 * 60 * 24))) :
    1;
  const consistencyRatio = Math.min(uniqueDays / Math.min(daysSinceFirstWorkout, 90), 1);
  const consistencyScore = consistencyRatio * 30;

  // Volume score (0-30 points) - trending up/stable
  const recentVolume = thisWeekWorkouts.reduce((sum, w) => sum + (w.volume_lbs || 0), 0);
  const volumeScore = Math.min((recentVolume / 10000) * 30, 30);

  const totalScore = Math.round(adherenceScore + consistencyScore + volumeScore);

  return {
    score: Math.min(totalScore, 100),
    details: {
      adherence: Math.round(adherenceScore),
      consistency: Math.round(consistencyScore),
      volume: Math.round(volumeScore)
    }
  };
}

/**
 * Calculate Rest Score (0-100)
 * Based on: sleep duration vs goal, sleep quality, consistency, inter-session spacing
 */
export function calculateRestScore(
  sleepLogs: SleepData[],
  workouts: WorkoutData[],
  sleepGoalHours: number = 8
): { score: number; details: { duration: number; quality: number; consistency: number; spacing: number } } {
  if (sleepLogs.length === 0) {
    return { score: 0, details: { duration: 0, quality: 0, consistency: 0, spacing: 0 } };
  }

  // Duration score (0-35 points) - avg sleep vs goal
  const avgSleepHours = sleepLogs.reduce((sum, s) => sum + s.duration_minutes, 0) / sleepLogs.length / 60;
  const durationRatio = Math.min(avgSleepHours / sleepGoalHours, 1);
  const durationScore = durationRatio * 35;

  // Quality score (0-25 points) - deep + REM percentage
  const qualityScores = sleepLogs.map(s => {
    if (s.quality_score !== undefined) return s.quality_score;
    const totalSleep = (s.deep_sleep_minutes || 0) + (s.rem_sleep_minutes || 0) + s.duration_minutes;
    if (totalSleep === 0) return 0;
    return ((s.deep_sleep_minutes || 0) + (s.rem_sleep_minutes || 0)) / totalSleep * 100;
  });
  const avgQuality = qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length;
  const qualityScore = Math.min((avgQuality / 50) * 25, 25);

  // Consistency score (0-20 points) - sleep duration variance
  const sleepHours = sleepLogs.map(s => s.duration_minutes / 60);
  const variance = sleepHours.reduce((sum, h) => sum + Math.pow(h - avgSleepHours, 2), 0) / sleepHours.length;
  const stdDev = Math.sqrt(variance);
  const consistencyRatio = Math.max(0, 1 - (stdDev / 2));
  const consistencyScore = consistencyRatio * 20;

  // Spacing score (0-20 points) - adequate rest between sessions
  let spacingScore = 20;
  if (workouts.length >= 2) {
    const sortedWorkouts = [...workouts].sort((a, b) =>
      new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime()
    );

    let tooCloseCount = 0;
    for (let i = 1; i < sortedWorkouts.length; i++) {
      const hoursBetween = (new Date(sortedWorkouts[i].workout_date).getTime() -
                           new Date(sortedWorkouts[i - 1].workout_date).getTime()) / (1000 * 60 * 60);
      if (hoursBetween < 24) tooCloseCount++;
    }
    spacingScore = Math.max(0, 20 - (tooCloseCount * 5));
  }

  const totalScore = Math.round(durationScore + qualityScore + consistencyScore + spacingScore);

  return {
    score: Math.min(totalScore, 100),
    details: {
      duration: Math.round(durationScore),
      quality: Math.round(qualityScore),
      consistency: Math.round(consistencyScore),
      spacing: Math.round(spacingScore)
    }
  };
}

/**
 * Calculate Energy Score (0-100)
 * Based on: calorie adherence, macro balance, deficit/surplus consistency
 */
export function calculateEnergyScore(
  energyData: EnergyData[]
): { score: number; details: { adherence: number; balance: number; consistency: number } } {
  if (energyData.length === 0) {
    return { score: 0, details: { adherence: 0, balance: 0, consistency: 0 } };
  }

  // Adherence score (0-40 points) - hitting calorie targets
  const adherenceRatios = energyData.map(d => {
    if (d.target_calories === 0) return 0;
    const ratio = d.calories / d.target_calories;
    // Perfect is 0.9-1.1, falls off outside that range
    if (ratio >= 0.9 && ratio <= 1.1) return 1;
    if (ratio < 0.9) return Math.max(0, ratio / 0.9);
    return Math.max(0, 2 - ratio);
  });
  const avgAdherence = adherenceRatios.reduce((sum, r) => sum + r, 0) / adherenceRatios.length;
  const adherenceScore = avgAdherence * 40;

  // Balance score (0-30 points) - macro distribution quality
  const balanceScores = energyData.map(d => {
    const totalCals = d.protein_g * 4 + d.carbs_g * 4 + d.fat_g * 9;
    if (totalCals === 0) return 0;

    const proteinPct = (d.protein_g * 4) / totalCals;
    const carbPct = (d.carbs_g * 4) / totalCals;
    const fatPct = (d.fat_g * 9) / totalCals;

    // Reasonable ranges: P 20-35%, C 25-55%, F 20-35%
    let score = 0;
    if (proteinPct >= 0.20 && proteinPct <= 0.35) score += 10;
    if (carbPct >= 0.25 && carbPct <= 0.55) score += 10;
    if (fatPct >= 0.20 && fatPct <= 0.35) score += 10;
    return score;
  });
  const balanceScore = balanceScores.reduce((sum, s) => sum + s, 0) / balanceScores.length;

  // Consistency score (0-30 points) - daily variance
  const dailyCalories = energyData.map(d => d.calories);
  const avgCals = dailyCalories.reduce((sum, c) => sum + c, 0) / dailyCalories.length;
  const variance = dailyCalories.reduce((sum, c) => sum + Math.pow(c - avgCals, 2), 0) / dailyCalories.length;
  const stdDev = Math.sqrt(variance);
  const cv = avgCals > 0 ? stdDev / avgCals : 1;
  const consistencyRatio = Math.max(0, 1 - cv);
  const consistencyScore = consistencyRatio * 30;

  const totalScore = Math.round(adherenceScore + balanceScore + consistencyScore);

  return {
    score: Math.min(totalScore, 100),
    details: {
      adherence: Math.round(adherenceScore),
      balance: Math.round(balanceScore),
      consistency: Math.round(consistencyScore)
    }
  };
}

/**
 * Calculate Effort Score (0-100)
 * Based on: RPE, volume load, progressive overload
 */
export function calculateEffortScore(
  workouts: WorkoutData[],
  previousWorkouts: WorkoutData[] = []
): { score: number; details: { rpe: number; volume: number; progression: number } } {
  if (workouts.length === 0) {
    return { score: 0, details: { rpe: 0, volume: 0, progression: 0 } };
  }

  // RPE score (0-35 points) - average intensity
  const avgRPE = workouts.reduce((sum, w) => sum + (w.avg_rpe || 0), 0) / workouts.length;
  // Optimal RPE range is 7-9 out of 10
  let rpeScore = 0;
  if (avgRPE >= 7 && avgRPE <= 9) {
    rpeScore = 35;
  } else if (avgRPE > 0) {
    rpeScore = Math.max(0, 35 - Math.abs(8 - avgRPE) * 7);
  }

  // Volume score (0-35 points) - total load moved
  const totalVolume = workouts.reduce((sum, w) => sum + (w.volume_lbs || 0), 0);
  const avgVolumePerSession = totalVolume / workouts.length;
  // Scale: 0-10k lbs per session
  const volumeScore = Math.min((avgVolumePerSession / 10000) * 35, 35);

  // Progression score (0-30 points) - trending upward
  let progressionScore = 15; // Default neutral
  if (previousWorkouts.length > 0) {
    const currentAvgVolume = totalVolume / workouts.length;
    const previousTotalVolume = previousWorkouts.reduce((sum, w) => sum + (w.volume_lbs || 0), 0);
    const previousAvgVolume = previousTotalVolume / previousWorkouts.length;

    if (previousAvgVolume > 0) {
      const growthRate = (currentAvgVolume - previousAvgVolume) / previousAvgVolume;
      // Ideal growth: 2-10% per period
      if (growthRate >= 0.02 && growthRate <= 0.10) {
        progressionScore = 30;
      } else if (growthRate > 0) {
        progressionScore = Math.min(30, 15 + growthRate * 150);
      } else {
        progressionScore = Math.max(0, 15 + growthRate * 150);
      }
    }
  }

  const totalScore = Math.round(rpeScore + volumeScore + progressionScore);

  return {
    score: Math.min(totalScore, 100),
    details: {
      rpe: Math.round(rpeScore),
      volume: Math.round(volumeScore),
      progression: Math.round(progressionScore)
    }
  };
}

/**
 * Calculate composite FREE score
 */
export function calculateCompositeScore(
  frequencyScore: number,
  restScore: number,
  energyScore: number,
  effortScore: number
): number {
  // Weighted average: F=25%, R=25%, E=25%, E=25%
  return Math.round((frequencyScore + restScore + energyScore + effortScore) / 4);
}

/**
 * Determine state based on comparison to baseline
 */
export function determineState(
  currentScore: number,
  baselineScore: number,
  threshold: number = 5
): 'growth' | 'plateau' | 'regression' {
  const delta = currentScore - baselineScore;
  if (delta > threshold) return 'growth';
  if (delta < -threshold) return 'regression';
  return 'plateau';
}

/**
 * Get color for score
 */
export function getScoreColor(score: number): 'green' | 'amber' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

/**
 * Get color classes for Tailwind
 */
export function getScoreColorClasses(score: number): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const color = getScoreColor(score);

  if (color === 'green') {
    return {
      bg: 'bg-green-600/20',
      text: 'text-green-300',
      border: 'border-green-500',
      dot: 'bg-green-500'
    };
  }

  if (color === 'amber') {
    return {
      bg: 'bg-yellow-600/20',
      text: 'text-yellow-300',
      border: 'border-yellow-500',
      dot: 'bg-yellow-500'
    };
  }

  return {
    bg: 'bg-red-600/20',
    text: 'text-red-300',
    border: 'border-red-500',
    dot: 'bg-red-500'
  };
}

/**
 * Calculate consistency streak
 */
export function calculateConsistencyStreak(
  workouts: WorkoutData[],
  weeklyGoal: number = 4
): { currentStreak: number; bestStreak: number } {
  if (workouts.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Group workouts by week
  const workoutsByWeek = new Map<string, number>();
  workouts.forEach(w => {
    const date = new Date(w.workout_date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);
    workoutsByWeek.set(weekKey, (workoutsByWeek.get(weekKey) || 0) + 1);
  });

  // Sort weeks
  const sortedWeeks = Array.from(workoutsByWeek.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  for (let i = sortedWeeks.length - 1; i >= 0; i--) {
    const [weekKey, count] = sortedWeeks[i];
    if (count >= weeklyGoal) {
      tempStreak++;
      if (i === sortedWeeks.length - 1) {
        currentStreak = tempStreak;
      }
    } else {
      if (i === sortedWeeks.length - 1) {
        currentStreak = 0;
      }
      bestStreak = Math.max(bestStreak, tempStreak);
      tempStreak = 0;
    }
  }

  bestStreak = Math.max(bestStreak, tempStreak);

  return { currentStreak, bestStreak };
}
