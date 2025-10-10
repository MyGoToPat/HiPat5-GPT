/**
 * Schema Map: Single source of truth for column mapping
 * Maps semantic names to actual production DB columns
 * NO database introspection at runtime - these are hardcoded constants
 */

export const MealLogColumns = {
  id: 'id',
  userId: 'user_id',
  timestamp: 'ts',
  mealSlot: 'meal_slot',
  source: 'source',
  totals: 'totals',           // JSONB, NOT NULL - dual-key format required
  microsTotals: 'micros_totals',
  note: 'note',
  messageId: 'message_id',    // nullable - links to chat
  clientConfidence: 'client_confidence',
  createdAt: 'created_at'
} as const;

export const MealItemColumns = {
  id: 'id',
  mealLogId: 'meal_log_id',   // FK to meal_logs.id
  userId: 'user_id',          // nullable in schema
  idx: 'idx',
  foodId: 'food_id',
  name: 'name',               // NOT NULL
  brand: 'brand',
  quantity: 'quantity',       // NOT NULL, default 1
  unit: 'unit',
  position: 'position',       // NOT NULL
  energyKcal: 'energy_kcal',  // NOT NULL, default 0
  proteinG: 'protein_g',      // NOT NULL, default 0
  fatG: 'fat_g',              // NOT NULL, default 0
  carbsG: 'carbs_g',          // NOT NULL, default 0
  fiberG: 'fiber_g',          // NOT NULL, default 0
  grams: 'grams',
  qtyGrams: 'qty_grams',
  macros: 'macros',           // JSONB
  micros: 'micros',           // JSONB
  confidence: 'confidence',
  sourceHints: 'source_hints',
  cacheId: 'cache_id',
  description: 'description',
  meta: 'meta',
  createdAt: 'created_at'
} as const;

export const MealSlotEnum = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner',
  SNACK: 'snack',
  UNSPECIFIED: 'unspecified'
} as const;

export const MealSourceEnum = {
  TEXT: 'text',
  VOICE: 'voice',
  PHOTO: 'photo'
} as const;

export type MealSlot = typeof MealSlotEnum[keyof typeof MealSlotEnum];
export type MealSource = typeof MealSourceEnum[keyof typeof MealSourceEnum];

/**
 * Dual-key totals format for meal_logs.totals JSONB
 * Includes both kcal and calories for future-proofing
 */
export interface MealTotals {
  kcal: number;
  calories: number;        // Same as kcal for compatibility
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

/**
 * Runtime guard to check if optional columns exist
 * Uses simple in-memory check - no DB introspection
 */
const optionalColumns = {
  meal_logs: {
    message_id: true,      // Confirmed to exist in production
    client_confidence: true,
    note: true
  },
  meal_items: {
    user_id: true,
    description: true,
    brand: true
  }
};

export function hasColumn(table: 'meal_logs' | 'meal_items', column: string): boolean {
  return optionalColumns[table]?.[column] ?? false;
}
