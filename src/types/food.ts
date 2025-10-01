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

// ========== TMWYA System Types ==========

export interface FoodCacheEntry {
  id: string; // canonical_name:brand:serving_size
  name: string;
  brand?: string;
  serving_size: string;
  grams_per_serving: number;
  macros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  micros?: {
    fiber_g?: number;
    sodium_mg?: number;
    potassium_mg?: number;
  };
  source_db: 'USDA' | 'OpenFoodFacts' | 'manual';
  usda_fdc_id?: string;
  off_barcode?: string;
  confidence: number;
  access_count: number;
  last_accessed: string;
  created_at: string;
  expires_at: string;
}

export interface DayRollup {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    tef_kcal: number;
    net_kcal: number;
  };
  targets?: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  delta?: {
    kcal_diff: number;
    protein_diff: number;
    carbs_diff: number;
    fat_diff: number;
  };
  completion?: {
    kcal_pct: number;
    protein_pct: number;
    meals_logged: number;
    last_meal_time: string;
  };
  meal_count: number;
  created_at: string;
  updated_at: string;
}

export interface MentorPlan {
  id: string;
  org_id: string;
  client_id: string;
  created_by_trainer_id: string;
  plan_name: string;
  daily_targets: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  meal_schedule?: {
    breakfast?: { time: string; kcal: number; macros: any };
    lunch?: { time: string; kcal: number; macros: any };
    dinner?: { time: string; kcal: number; macros: any };
    snack?: { time: string; kcal: number; macros: any };
  };
  dietary_restrictions?: string[];
  notes?: string;
  active: boolean;
  starts_on: string; // YYYY-MM-DD
  ends_on?: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface ComplianceEvent {
  id: string;
  user_id: string;
  mentor_plan_id: string;
  meal_log_id?: string;
  event_type: 'over_calories' | 'under_protein' | 'missed_meal' | 'excellent_day' | 'custom';
  severity: 'info' | 'warning' | 'success';
  message: string;
  delta?: {
    kcal_over?: number;
    protein_short?: number;
    [key: string]: number | undefined;
  };
  created_at: string;
}

// Vision API response types
export interface VisionAnalysisResult {
  items: {
    name: string;
    brand?: string;
    candidates: AnalysedFoodCandidate[];
    portion_hint: 'S' | 'M' | 'L';
    confidence: number;
  }[];
  meal_slot?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown';
  source: 'photo' | 'barcode';
  vision_metadata?: {
    model: string;
    processing_time_ms: number;
    image_hash?: string;
  };
}

// NLU Parser output
export interface MealNLUParseResult {
  items: {
    name: string;
    qty?: number;
    unit?: string;
    brand?: string;
    prep_method?: string; // 'grilled', 'fried', 'raw', etc.
    originalText: string;
  }[];
  meal_slot?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown';
  meal_time?: string;
  confidence: number;
  clarifications_needed?: string[];
}

// Food resolution request/response
export interface FoodResolutionRequest {
  name: string;
  brand?: string;
  qty?: number;
  unit?: string;
  grams?: number;
}

export interface FoodResolutionResponse {
  ok: boolean;
  candidates: AnalysedFoodCandidate[];
  cache_hit: boolean;
  source_db?: string;
  error?: string;
}

// TDEE comparison for verification screen
export interface TDEEComparison {
  meal_kcal: number;
  daily_kcal_consumed: number;
  daily_kcal_target: number;
  daily_kcal_remaining: number;
  meal_as_pct_of_daily: number;
  protein_consumed: number;
  protein_target: number;
  protein_remaining: number;
  on_track: boolean;
  message: string;
}