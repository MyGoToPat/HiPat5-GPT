import { MetricAlert } from '../types/metrics';

export interface UserMetrics {
  workoutStreak: number;
  sleepQuality: number; // 0-100
  proteinTarget: number; // percentage of target met
  lastWorkout: Date;
  missedWorkouts: number;
  recentPRs: number;
  consistencyScore: number; // 0-100
}

export type PatMood = 'neutral' | 'speaking' | 'listening' | 'happy' | 'concerned' | 'excited' | 'disappointed' | 'proud' | 'sleepy' | 'energetic';

export class PatMoodCalculator {
  static calculateMood(metrics: UserMetrics, alerts: MetricAlert[]): PatMood {
    const {
      workoutStreak,
      sleepQuality,
      proteinTarget,
      lastWorkout,
      missedWorkouts,
      recentPRs,
      consistencyScore
    } = metrics;

    // Check for critical alerts first
    const criticalAlerts = alerts.filter(alert => 
      alert.severity === 'critical' && !alert.dismissed
    );
    
    const warningAlerts = alerts.filter(alert => 
      alert.severity === 'warning' && !alert.dismissed
    );

    // Time since last workout
    const daysSinceWorkout = Math.floor(
      (Date.now() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Excited conditions (highest priority positive)
    if (recentPRs >= 2 && workoutStreak >= 5 && consistencyScore >= 90) {
      return 'excited';
    }

    // Proud conditions
    if (workoutStreak >= 7 || (recentPRs >= 1 && consistencyScore >= 80)) {
      return 'proud';
    }

    // Happy conditions
    if (
      workoutStreak >= 3 && 
      sleepQuality >= 75 && 
      proteinTarget >= 80 && 
      daysSinceWorkout <= 1
    ) {
      return 'happy';
    }

    // Energetic conditions
    if (sleepQuality >= 85 && daysSinceWorkout === 0 && consistencyScore >= 70) {
      return 'energetic';
    }

    // Sleepy conditions
    if (sleepQuality <= 60 || alerts.some(a => a.type === 'sleep_debt')) {
      return 'sleepy';
    }

    // Disappointed conditions
    if (
      criticalAlerts.length > 0 || 
      (missedWorkouts >= 3 && workoutStreak === 0) ||
      daysSinceWorkout >= 4
    ) {
      return 'disappointed';
    }

    // Concerned conditions
    if (
      warningAlerts.length >= 2 || 
      daysSinceWorkout >= 2 || 
      proteinTarget <= 50 ||
      consistencyScore <= 40
    ) {
      return 'concerned';
    }

    // Default to neutral
    return 'neutral';
  }

  static getMoodMessage(mood: PatMood): string {
    switch (mood) {
      case 'excited':
        return "You're crushing it! I'm so excited about your progress! 🎉";
      case 'proud':
        return "I'm really proud of your consistency and achievements! 💪";
      case 'happy':
        return "You're doing great! Keep up the excellent work! 😊";
      case 'energetic':
        return "You're full of energy today! Let's make the most of it! ⚡";
      case 'sleepy':
        return "You seem tired. Maybe it's time to focus on better sleep? 😴";
      case 'concerned':
        return "I'm a bit concerned about some of your metrics. Let's work on this together. 🤔";
      case 'disappointed':
        return "I know you can do better. Let's get back on track! 💙";
      case 'speaking':
        return "I'm here to help with whatever you need! 🗣️";
      case 'listening':
        return "I'm listening carefully to what you have to say... 👂";
      default:
        return "Hi! I'm here to help you with your health and fitness goals! 👋";
    }
  }

  static getMoodColor(mood: PatMood): string {
    switch (mood) {
      case 'happy':
      case 'excited':
        return 'text-green-400';
      case 'proud':
        return 'text-purple-400';
      case 'energetic':
        return 'text-cyan-400';
      case 'concerned':
        return 'text-orange-400';
      case 'disappointed':
        return 'text-red-400';
      case 'sleepy':
        return 'text-indigo-400';
      default:
        return 'text-blue-400';
    }
  }
}