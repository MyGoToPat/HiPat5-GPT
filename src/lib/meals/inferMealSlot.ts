/**
 * Meal Slot Inference
 * Simple, deterministic time-based meal slot detection
 */

import { MealSlot, MealSlotEnum } from './schemaMap';

/**
 * Infers meal slot from a timestamp based on hour of day
 *
 * Rules:
 * - 03:59–10:59 → breakfast
 * - 11:00–15:59 → lunch
 * - 16:00–21:59 → dinner
 * - else → snack
 *
 * @param date - Date object (typically now(), in user's local timezone)
 * @returns MealSlot enum value
 */
export function inferMealSlot(date: Date = new Date()): MealSlot {
  const hour = date.getHours();

  if (hour >= 4 && hour <= 10) {
    return MealSlotEnum.BREAKFAST;
  }

  if (hour >= 11 && hour <= 15) {
    return MealSlotEnum.LUNCH;
  }

  if (hour >= 16 && hour <= 21) {
    return MealSlotEnum.DINNER;
  }

  return MealSlotEnum.SNACK;
}

/**
 * Get start and end of today in user's local timezone
 * Returns ISO strings suitable for Supabase timestamp comparison
 */
export function getTodayBounds(): { startOfToday: string; startOfTomorrow: string } {
  const now = new Date();

  // Start of today (00:00:00)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Start of tomorrow (00:00:00)
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

  return {
    startOfToday: startOfToday.toISOString(),
    startOfTomorrow: startOfTomorrow.toISOString()
  };
}
