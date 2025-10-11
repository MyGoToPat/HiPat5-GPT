/**
 * Timezone-aware date range utilities
 * Provides consistent day boundaries across the application
 */

export interface DayBounds {
  startISO: string;
  endISO: string;
}

/**
 * Get start and end of "today" in the user's timezone as UTC ISO strings
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @param now - Reference date (defaults to current time)
 * @returns Start and end of day as UTC ISO strings
 */
export function todayBounds(timezone: string, now = new Date()): DayBounds {
  try {
    // Get the date string in user's timezone
    const dateStr = now.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });

    // Parse to get local date components
    const [dateOnly] = dateStr.split(',');
    const [month, day, year] = dateOnly.trim().split('/');

    // Create midnight in user's timezone
    const localMidnight = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);

    // Convert to UTC by adjusting for timezone offset
    const utcMidnight = new Date(localMidnight.toLocaleString('en-US', { timeZone: 'UTC' }));

    // Start of day (00:00:00.000)
    const startISO = new Date(Date.UTC(
      utcMidnight.getUTCFullYear(),
      utcMidnight.getUTCMonth(),
      utcMidnight.getUTCDate(),
      0, 0, 0, 0
    )).toISOString();

    // End of day (23:59:59.999)
    const endISO = new Date(Date.UTC(
      utcMidnight.getUTCFullYear(),
      utcMidnight.getUTCMonth(),
      utcMidnight.getUTCDate(),
      23, 59, 59, 999
    )).toISOString();

    return { startISO, endISO };
  } catch (error) {
    console.error('Error computing timezone bounds:', error);
    // Fallback to UTC day
    const utcStart = new Date(now);
    utcStart.setUTCHours(0, 0, 0, 0);

    const utcEnd = new Date(now);
    utcEnd.setUTCHours(23, 59, 59, 999);

    return {
      startISO: utcStart.toISOString(),
      endISO: utcEnd.toISOString()
    };
  }
}

/**
 * Get start and end of a specific date in the user's timezone
 * @param date - Date to get bounds for
 * @param timezone - IANA timezone string
 * @returns Start and end of the specified date as UTC ISO strings
 */
export function dateBounds(date: Date, timezone: string): DayBounds {
  return todayBounds(timezone, date);
}
