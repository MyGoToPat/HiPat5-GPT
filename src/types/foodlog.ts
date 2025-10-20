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

// ========== V1 Meal Logging System Types ==========

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
};

export type V1FoodItem = {
  name: string;
  quantity: number;
  unit: string;
  macros?: MacroTotals;
  brand?: string;
  confidence?: number;
};

export type ClarificationPlan = {
  missing: string[];
  questions: string[];
  max_followups: number;
};

export type FoodLogResponseStep =
  | 'unified_complete'
  | 'needs_clarification'
  | 'open_verify';

export type FoodLogResponse = {
  ok: boolean;
  kind: 'food_log';
  step: FoodLogResponseStep;
  message: string;
  logged: boolean;
  needsClarification: boolean;
  analysisResult: {
    confidence: number;
    items: V1FoodItem[];
    totals: MacroTotals;
  };
  clarificationPlan?: ClarificationPlan;
  undo_token?: string;
  error?: string;
};

export type AutosaveGates = {
  confidence: boolean;
  hasItems: boolean;
  hasCompleteData: boolean;
  validCalories: boolean;
};

export type UndoToken = {
  id: string;
  user_id: string;
  meal_log_id: string;
  meal_items_ids: string[];
  created_at: string;
  expires_at: string;
  used: boolean;
};