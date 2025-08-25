import type { FoodItem, MealAnalysis, FoodLogEntry, FoodLogConfig } from '../types/foodlog';

const DEFAULT_CONFIG: FoodLogConfig = {
  dietStyle: 'standard',
  units: 'us',
  defaultServing: 1,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  strictParsing: false
};

const FOOD_DICTIONARY: Record<string, { kcal: number; protein: number; carbs: number; fat: number; unit: string }> = {
  'egg': { kcal: 78, protein: 6, carbs: 0.6, fat: 5, unit: 'each' },
  'toast': { kcal: 80, protein: 3, carbs: 14, fat: 1, unit: 'slice' },
  'bread': { kcal: 80, protein: 3, carbs: 14, fat: 1, unit: 'slice' },
  'butter': { kcal: 34, protein: 0, carbs: 0, fat: 4, unit: 'tsp' },
  'coffee': { kcal: 2, protein: 0, carbs: 0, fat: 0, unit: 'cup' },
  'oatmeal': { kcal: 150, protein: 5, carbs: 27, fat: 3, unit: '½ cup dry' },
  'banana': { kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, unit: 'medium' },
  'chicken breast': { kcal: 187, protein: 35, carbs: 0, fat: 4, unit: '4 oz' },
  'chicken': { kcal: 187, protein: 35, carbs: 0, fat: 4, unit: '4 oz' },
  'rice': { kcal: 206, protein: 4, carbs: 45, fat: 0.4, unit: '1 cup cooked' },
  'olive oil': { kcal: 119, protein: 0, carbs: 0, fat: 14, unit: 'tbsp' }
};

const UNIT_CONVERSIONS: Record<string, number> = {
  // All conversions to grams for metric calculations
  'oz': 28.3495,
  'lb': 453.592,
  'cup': 240, // approximate for liquids
  'tbsp': 15,
  'tsp': 5,
  'g': 1,
  'kg': 1000,
  'ml': 1, // approximate for water density
  'l': 1000
};

export function getFoodLogConfig(): FoodLogConfig {
  try {
    const stored = localStorage.getItem('hipat:foodlog:config');
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load FoodLog config:', error);
  }
  return DEFAULT_CONFIG;
}

export function saveFoodLogConfig(config: FoodLogConfig): void {
  try {
    localStorage.setItem('hipat:foodlog:config', JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save FoodLog config:', error);
  }
}

export function parseMeal(text: string, config: FoodLogConfig): MealAnalysis {
  const items: FoodItem[] = [];
  const notes: string[] = [];
  const unknownTokens: string[] = [];

  // Simple tokenization
  const cleanText = text.toLowerCase().replace(/[.,!?]/g, '').trim();
  const segments = cleanText.split(/\s+(?:and|with|w\/)\s+|,\s*/);

  segments.forEach((segment) => {
    const result = parseSegment(segment.trim(), config);
    if (result.item) {
      items.push(result.item);
    }
    if (result.unknown && config.strictParsing) {
      unknownTokens.push(result.unknown);
    }
  });

  // Add unknown tokens to notes in strict mode
  if (config.strictParsing && unknownTokens.length > 0) {
    notes.push(`Unknown tokens: ${unknownTokens.join(', ')}`);
  }

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Round totals to 1 decimal
  Object.keys(totals).forEach(key => {
    totals[key as keyof typeof totals] = Math.round(totals[key as keyof typeof totals] * 10) / 10;
  });

  // Calculate overall confidence
  const avgConfidence = items.length > 0 
    ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length 
    : 0;

  return {
    items,
    totals,
    notes,
    confidence: Math.round(avgConfidence * 100) / 100
  };
}

function parseSegment(segment: string, config: FoodLogConfig): { item?: FoodItem; unknown?: string } {
  // Extract quantity and unit
  const qtyMatch = segment.match(/^(\d+(?:\.\d+)?)\s*([a-z]*)\s+(.+)$/);
  
  let qty = config.defaultServing;
  let unit = '';
  let foodName = segment;

  if (qtyMatch) {
    qty = parseFloat(qtyMatch[1]);
    unit = qtyMatch[2] || '';
    foodName = qtyMatch[3];
  }

  // Handle special cases like "half" or "1/2"
  if (segment.includes('half') || segment.includes('1/2')) {
    qty = 0.5;
    foodName = foodName.replace(/\b(half|1\/2)\s+/, '');
  }

  // Find food in dictionary
  const foodKey = findFoodMatch(foodName);
  if (!foodKey) {
    return { unknown: foodName };
  }

  const baseFood = FOOD_DICTIONARY[foodKey];
  
  // Calculate scaling factor based on quantity and unit
  const scalingFactor = calculateScaling(qty, unit, baseFood.unit, config);
  
  const item: FoodItem = {
    id: crypto.randomUUID(),
    name: formatFoodName(foodKey, qty, unit || baseFood.unit),
    qty,
    unit: unit || baseFood.unit,
    kcal: Math.round(baseFood.kcal * scalingFactor * 10) / 10,
    protein: Math.round(baseFood.protein * scalingFactor * 10) / 10,
    carbs: Math.round(baseFood.carbs * scalingFactor * 10) / 10,
    fat: Math.round(baseFood.fat * scalingFactor * 10) / 10,
    confidence: 1.0 // Exact match for deterministic stub
  };

  return { item };
}

function findFoodMatch(name: string): string | null {
  const normalizedName = name.toLowerCase().trim();
  
  // Direct matches
  for (const key of Object.keys(FOOD_DICTIONARY)) {
    if (normalizedName.includes(key)) {
      return key;
    }
  }
  
  // Special aliases
  if (normalizedName.includes('bread')) return 'toast';
  if (normalizedName.includes('eggs')) return 'egg';
  
  return null;
}

function calculateScaling(qty: number, unit: string, baseUnit: string, config: FoodLogConfig): number {
  // Handle special base units
  if (baseUnit === '½ cup dry') {
    // Oatmeal case - 0.5 cups dry is the base
    if (unit === 'cup' || unit === 'cups') {
      return qty / 0.5;
    }
    return qty; // Default to quantity as-is
  }
  
  if (baseUnit === 'medium') {
    // Banana case - assume quantity is number of medium bananas
    return qty;
  }
  
  if (baseUnit === '4 oz') {
    // Chicken breast case
    if (unit === 'oz') {
      return qty / 4;
    }
    if (unit === 'g' && config.units === 'metric') {
      const ozEquivalent = qty / UNIT_CONVERSIONS.oz;
      return ozEquivalent / 4;
    }
    return qty; // Default assumption
  }
  
  if (baseUnit === '1 cup cooked') {
    // Rice case
    if (unit === 'cup' || unit === 'cups') {
      return qty;
    }
    return qty; // Default assumption
  }
  
  // Standard unit matching
  if (unit === baseUnit || !unit) {
    return qty;
  }
  
  return qty; // Default fallback
}

function formatFoodName(foodKey: string, qty: number, unit: string): string {
  const displayName = foodKey.charAt(0).toUpperCase() + foodKey.slice(1);
  return `${displayName} (${qty} ${unit})`;
}

export function saveEntry(entry: FoodLogEntry, config: FoodLogConfig): void {
  try {
    const today = getTodayKey(config.timezone);
    const key = `hipat:foodlog:entries:${today}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as FoodLogEntry[];
    existing.push(entry);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (error) {
    console.warn('Failed to save food log entry:', error);
  }
}

export function listEntries(dateISO: string, config: FoodLogConfig): FoodLogEntry[] {
  try {
    const key = `hipat:foodlog:entries:${dateISO}`;
    return JSON.parse(localStorage.getItem(key) || '[]') as FoodLogEntry[];
  } catch (error) {
    console.warn('Failed to load food log entries:', error);
    return [];
  }
}

export function undoLast(dateISO: string, config: FoodLogConfig): void {
  try {
    const key = `hipat:foodlog:entries:${dateISO}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as FoodLogEntry[];
    if (existing.length > 0) {
      existing.pop();
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (error) {
    console.warn('Failed to undo last food log entry:', error);
  }
}

function getTodayKey(timezone: string): string {
  const now = new Date();
  // Simple date formatting for localStorage key
  return now.toISOString().split('T')[0];
}