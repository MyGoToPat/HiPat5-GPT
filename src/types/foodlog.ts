// Food log types stub - UI removed, keeping minimal types for compilation
export interface FoodItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

export interface MealAnalysis {
  items: FoodItem[];
  totals: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  notes: string[];
  confidence: number;
}

export interface FoodLogEntry {
  id: string;
  timestamp: string;
  items: FoodItem[];
  totals: MealAnalysis['totals'];
  notes: string[];
}

export interface FoodLogConfig {
  dietStyle: 'standard' | 'lowcarb' | 'mediterranean';
  units: 'us' | 'metric';
  defaultServing: number;
  timezone: string;
  strictParsing: boolean;
}