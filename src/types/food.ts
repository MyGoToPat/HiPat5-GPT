export interface FoodEntry {
  id: string;          // uuid v4
  foodName: string;
  grams: number;
  sourceDb: string;    // e.g. "USDA"
  macros: { kcal: number; protein: number; carbs: number; fat: number };
  createdAt: string;   // ISO
  confidence?: number; // optional
}

export interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  servingSize: string;
  macros: { kcal: number; protein: number; carbs: number; fat: number };
  sourceDb: string;
}

export interface AnalysedFoodItem {
  id: string;
  name: string;
  confidence: number;
  grams: number;
  macros: { kcal: number; protein: number; carbs: number; fat: number };
  portionSize?: 'S' | 'M' | 'L';
  unit?: string;
}

export interface FoodAnalysisResult {
  foods: AnalysedFoodItem[];
  totalCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  confidence: number;
}

export interface AnalysedFoodCandidate {
  name: string;
  brand?: string;
  macros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  confidence: number;
}

export interface AnalysedFoodItemWithCandidates {
  name: string;
  brand?: string;
  candidates?: AnalysedFoodCandidate[];
  qty?: number;
  unit?: string;
  grams?: number;
  macros?: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  confidence?: number;
  source_hints?: any;
  originalText?: string; // Track original parsed text for debugging
}

export interface AnalysisResult {
  items: AnalysedFoodItemWithCandidates[];
  meal_slot?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown';
  source: 'photo' | 'barcode' | 'text';
  originalInput?: string; // Track original user input
}

export interface NormalizedMealItem {
  position: number;
  cache_id?: string;
  name: string;
  brand?: string;
  qty?: number;
  unit?: string;
  grams?: number;
  macros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  micros?: any;
  confidence?: number;
  source_hints?: any;
}

export interface NormalizedMealLog {
  ts: string;
  meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown';
  source: 'photo' | 'barcode' | 'text';
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    tef_kcal?: number;
  };
  note?: string;
  client_confidence?: number;
}

export interface NormalizedMealData {
  mealLog: NormalizedMealLog;
  mealItems: NormalizedMealItem[];
}

export interface NutritionDatabase {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // 1 = highest priority
}