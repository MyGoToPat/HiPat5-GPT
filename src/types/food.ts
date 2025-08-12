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

export interface NutritionDatabase {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // 1 = highest priority
}