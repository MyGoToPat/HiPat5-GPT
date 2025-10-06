/**
 * Time & Meal Slot Parser
 * Phase 8: Parses natural language timestamps for meal logging
 */

export interface ParsedTime {
  date: Date;
  mealSlot?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  explicit: boolean; // true if user specified time explicitly
}

/**
 * Parses time from user message
 * Examples:
 * - "at 9 AM today" → today 9:00
 * - "for breakfast" → today with breakfast default time
 * - "last night at 10 PM" → yesterday 22:00
 * - "yesterday lunch" → yesterday with lunch default time
 */
export function parseMealTime(userMessage: string, userTimezone?: string): ParsedTime {
  const lowerMsg = userMessage.toLowerCase();
  const now = new Date();

  // Default meal slot times
  const slotDefaults = {
    breakfast: 8,  // 8 AM
    lunch: 12,     // 12 PM
    dinner: 18,    // 6 PM
    snack: 15      // 3 PM
  };

  // Pattern 1: Explicit time "at 9 AM", "at 2:30 PM"
  const timeMatch = lowerMsg.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();

    // Convert to 24h format
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;

    // Check for day indicators
    const date = new Date(now);
    if (/yesterday|last\s+night/.test(lowerMsg)) {
      date.setDate(date.getDate() - 1);
    }

    date.setHours(hour, minute, 0, 0);

    return {
      date,
      explicit: true
    };
  }

  // Pattern 2: Meal slots "for breakfast", "at breakfast", "breakfast at"
  for (const [slot, defaultHour] of Object.entries(slotDefaults)) {
    const slotPattern = new RegExp(`\\b(for|at)?\\s*${slot}\\b`, 'i');
    if (slotPattern.test(lowerMsg)) {
      const date = new Date(now);

      // Check for day indicators
      if (/yesterday/.test(lowerMsg)) {
        date.setDate(date.getDate() - 1);
      }

      date.setHours(defaultHour, 0, 0, 0);

      return {
        date,
        mealSlot: slot as any,
        explicit: false
      };
    }
  }

  // Pattern 3: Relative time "last night" without explicit time
  if (/last\s+night/.test(lowerMsg)) {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    date.setHours(20, 0, 0, 0); // 8 PM default
    return { date, explicit: false };
  }

  // Default: current time
  return {
    date: now,
    explicit: false
  };
}

/**
 * Formats parsed time for display
 */
export function formatMealTime(parsedTime: ParsedTime): string {
  const { date } = parsedTime;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  if (isToday) {
    return `today at ${timeStr}`;
  } else if (isYesterday) {
    return `yesterday at ${timeStr}`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }) + ` at ${timeStr}`;
  }
}
