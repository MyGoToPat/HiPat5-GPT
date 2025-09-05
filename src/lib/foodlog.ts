// Food log stub - UI removed, keeping minimal exports for compilation
export type FoodEntry = { id?: string; ts?: string; calories?: number };
export type FoodLogConfig = { units?: string; timezone?: string };
export type MealAnalysis = { items: any[]; totals: any; notes: string[]; confidence: number };
export type FoodLogEntry = { id?: string; timestamp?: string; items?: any[]; totals?: any; notes?: string[] };

export async function saveFoodEntry(_: FoodEntry): Promise<void> {}
export async function getFoodSummary(): Promise<{ calories: number }> { return { calories: 0 }; }
export function getFoodLogConfig(): FoodLogConfig { return {}; }
export function saveFoodLogConfig(_: FoodLogConfig): void {}
export function parseMeal(_: string, __?: FoodLogConfig): MealAnalysis { 
  return { items: [], totals: {}, notes: [], confidence: 0 }; 
}
export function saveEntry(_: FoodLogEntry, __?: FoodLogConfig): void {}
export function listEntries(_: string, __?: FoodLogConfig): FoodLogEntry[] { return []; }
export function undoLast(_: string, __?: FoodLogConfig): void {}