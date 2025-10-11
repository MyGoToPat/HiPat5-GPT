/**
 * Time Parser Agent
 *
 * Extracts time information from natural language.
 * Timezone-aware, supports relative and absolute times.
 */

export interface ParsedTime {
  timestamp: string; // ISO string
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  confidence: number;
  rawPhrase?: string;
}

/**
 * Parse time from text (with timezone)
 */
export function parseTime(text: string, timezone: string = 'America/New_York'): ParsedTime {
  const now = new Date();
  const lowerText = text.toLowerCase();

  // Check for meal slot keywords
  const mealSlots = {
    breakfast: ['breakfast', 'this morning', 'for breakfast'],
    lunch: ['lunch', 'for lunch', 'at lunch'],
    dinner: ['dinner', 'for dinner', 'tonight', 'this evening'],
    snack: ['snack', 'for snack']
  };

  let mealSlot: ParsedTime['mealSlot'] = null;
  let rawPhrase: string | undefined;

  for (const [slot, keywords] of Object.entries(mealSlots)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        mealSlot = slot as ParsedTime['mealSlot'];
        rawPhrase = keyword;
        break;
      }
    }
    if (mealSlot) break;
  }

  // Check for relative times
  const relativePatterns = [
    { pattern: /(\d+)\s*hours?\s*ago/i, unit: 'hours' },
    { pattern: /(\d+)\s*minutes?\s*ago/i, unit: 'minutes' },
    { pattern: /just now|right now/i, unit: 'now' }
  ];

  for (const { pattern, unit } of relativePatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      let timestamp = new Date(now);

      if (unit === 'hours') {
        timestamp.setHours(timestamp.getHours() - parseInt(match[1], 10));
      } else if (unit === 'minutes') {
        timestamp.setMinutes(timestamp.getMinutes() - parseInt(match[1], 10));
      }

      return {
        timestamp: timestamp.toISOString(),
        mealSlot: inferMealSlotFromTime(timestamp),
        confidence: 0.9,
        rawPhrase: match[0]
      };
    }
  }

  // Check for absolute times (e.g., "at 2pm", "at 14:00")
  const absolutePattern = /at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const absoluteMatch = lowerText.match(absolutePattern);

  if (absoluteMatch) {
    let hours = parseInt(absoluteMatch[1], 10);
    const minutes = absoluteMatch[2] ? parseInt(absoluteMatch[2], 10) : 0;
    const meridiem = absoluteMatch[3]?.toLowerCase();

    if (meridiem === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    const timestamp = new Date(now);
    timestamp.setHours(hours, minutes, 0, 0);

    // If time is in the future, assume it was earlier today
    if (timestamp > now) {
      timestamp.setDate(timestamp.getDate() - 1);
    }

    return {
      timestamp: timestamp.toISOString(),
      mealSlot: inferMealSlotFromTime(timestamp),
      confidence: 0.95,
      rawPhrase: absoluteMatch[0]
    };
  }

  // Default: current time
  return {
    timestamp: now.toISOString(),
    mealSlot: mealSlot || inferMealSlotFromTime(now),
    confidence: mealSlot ? 0.8 : 0.5,
    rawPhrase
  };
}

/**
 * Infer meal slot from timestamp
 */
function inferMealSlotFromTime(timestamp: Date): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = timestamp.getHours();

  if (hour >= 5 && hour < 11) {
    return 'breakfast';
  } else if (hour >= 11 && hour < 15) {
    return 'lunch';
  } else if (hour >= 15 && hour < 21) {
    return 'dinner';
  } else {
    return 'snack';
  }
}
