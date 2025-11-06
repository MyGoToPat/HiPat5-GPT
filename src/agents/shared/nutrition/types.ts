export type PortionedItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  confidence: number; // 0..1
  reason?: string; // Optional explanation when confidence < 0.7
  // Brand fields (for branded items)
  brand?: string | null;
  serving_label?: string | null;
  size_label?: string | null;
  is_branded?: boolean;
};

export type MacroItem = {
  name: string;
  quantity: number | null;
  unit: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  confidence: number; // 0..1 (source reliability)
  source: string;     // 'usda' | 'cache' | 'rules' | 'fallback'
};

export type MealTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export type MealEstimate = {
  items: MacroItem[];
  totals: MealTotals;
};

export type TefBreakdown = {
  kcal: number;
  by_macro: { protein: number; carbs: number; fat: number };
};

export type TdeeResult = {
  target_kcal: number;
  used_kcal: number;
  remaining_kcal: number;
  remaining_percentage: number;
  meals_today: number;
  last_meal_at: string | null;
  projection: { projected_total: number; projected_remaining: number };
};

