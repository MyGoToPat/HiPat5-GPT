import type { MealEstimate, MacroItem, MealTotals, PortionedItem } from "./types";

const macroCache = new Map<string, MacroItem>();

// Per-unit reference macros (rounded to 1 d.p.) - ALL INCLUDE FIBER
const REF: Record<string, { unit: string; cals: number; p: number; c: number; f: number; fi: number; source: string }> = {
  "egg:piece":            { unit: "piece", cals: 70,  p: 6.3, c: 0.4, f: 5.0, fi: 0.0, source: "rules" },
  "bread_slice:slice":    { unit: "slice", cals: 80,  p: 3.0, c: 15.0,f: 1.0, fi: 1.0, source: "rules" }, // sourdough/white bread
  "bread_sourdough:slice":{ unit: "slice", cals: 80,  p: 3.0, c: 15.0,f: 1.0, fi: 1.0, source: "rules" },
  "oatmeal:cup":          { unit: "cup",   cals: 154, p: 6.0, c: 27.0,f: 3.0, fi: 4.0, source: "rules" }, // cooked
  "milk_skim:cup":        { unit: "cup",   cals: 83,  p: 8.3, c: 12.0,f: 0.2, fi: 0.0, source: "rules" },
  "milk_1%:cup":          { unit: "cup",   cals: 102, p: 8.2, c: 12.2,f: 2.4, fi: 0.0, source: "rules" },
  "milk_2%:cup":          { unit: "cup",   cals: 122, p: 8.1, c: 11.7,f: 4.8, fi: 0.0, source: "rules" },
  "milk_whole:cup":       { unit: "cup",   cals: 149, p: 7.7, c: 11.7,f: 7.9, fi: 0.0, source: "rules" },
  "ribeye:oz":            { unit: "oz",    cals: 77,  p: 7.0, c: 0.0, f: 5.5, fi: 0.0, source: "rules" }, // 80% lean beef
  "rice_cooked:cup":      { unit: "cup",   cals: 206, p: 4.3, c: 45.0,f: 0.4, fi: 0.6, source: "rules" },
  "chicken_breast:100g":  { unit: "g",     cals: 165, p: 31.0,c: 0.0, f: 3.6, fi: 0.0, source: "rules" },
  "beef_80lean:100g":     { unit: "g",     cals: 254, p: 26.0,c: 0.0, f: 17.0,fi: 0.0, source: "rules" },
  "banana:piece":         { unit: "piece", cals: 105, p: 1.3, c: 27.0,f: 0.4, fi: 3.1, source: "rules" },
  "apple:piece":          { unit: "piece", cals: 95,  p: 0.5, c: 25.0,f: 0.3, fi: 4.4, source: "rules" },
  "broccoli:cup":         { unit: "cup",   cals: 31,  p: 2.5, c: 6.0, f: 0.3, fi: 2.4, source: "rules" },
  "spinach:cup":          { unit: "cup",   cals: 7,   p: 0.9, c: 1.1, f: 0.1, fi: 0.7, source: "rules" },
  "yogurt_plain:cup":     { unit: "cup",   cals: 149, p: 8.5, c: 11.4,f: 7.9, fi: 0.0, source: "rules" }
};

function round1(n: number) { return Math.max(0, Math.round(n * 10) / 10); }

function keyFrom(p: PortionedItem): string {
  const name = (p.name || "").toLowerCase().replace(/\s+/g, "_").replace(/%/g, ""); // Remove % signs
  const unit = (p.unit || "").toLowerCase();
  
  // Match eggs (whole, large, egg, etc.)
  if (/\b(egg|eggs|whole_egg|large_egg)\b/.test(name)) return "egg:piece";
  
  // Match bread (slice, sourdough, bread, etc.)
  if (/\b(sourdough|bread|slice)\b/.test(name) && unit === "slice") return "bread_sourdough:slice";
  if (/\bbread\b/.test(name) && unit === "slice") return "bread_slice:slice";
  
  // Match oatmeal/oats
  if (/\b(oatmeal|oats)\b/.test(name)) return "oatmeal:cup";
  
  // Match milk variations (PRIORITY ORDER: specific to general)
  if (/\b(2_milk|2_milk)\b/.test(name) && unit === "cup") return "milk_2%:cup";
  if (/\b(1_milk|1_milk)\b/.test(name) && unit === "cup") return "milk_1%:cup";
  if (/\b(skim_milk|skim|nonfat_milk)\b/.test(name)) return "milk_skim:cup";
  if (/\b(whole_milk)\b/.test(name) && unit === "cup") return "milk_whole:cup";
  if (/\bmilk\b/.test(name) && unit === "cup") return "milk_2%:cup"; // Default to 2% for generic "milk"
  
  // Match ribeye/steak
  if (/\b(ribeye|steak)\b/.test(name) && unit === "oz") return "ribeye:oz";
  
  // Match rice
  if (/\brice\b/.test(name)) return "rice_cooked:cup";
  
  // Match chicken
  if (/\bchicken\b/.test(name)) return "chicken_breast:100g";
  
  // Match beef
  if (/\bbeef\b/.test(name)) return "beef_80lean:100g";
  
  // Match fruits
  if (/\bbanana\b/.test(name)) return "banana:piece";
  if (/\bapple\b/.test(name)) return "apple:piece";
  
  // Match vegetables
  if (/\bbroccoli\b/.test(name)) return "broccoli:cup";
  if (/\bspinach\b/.test(name)) return "spinach:cup";
  
  // Match yogurt
  if (/\byogurt\b/.test(name)) return "yogurt_plain:cup";
  
  return "";
}

function toQuantityFactor(p: PortionedItem, refUnit: string): number {
  const q = p.quantity ?? 1;
  const u = (p.unit ?? "").toLowerCase();
  if (!q || !u) return 1;

  // Same unit
  if (u === refUnit) return q;

  // Simple unit conversions
  if (refUnit === "g" && u === "oz") return q * 28.3495;
  if (refUnit === "oz" && u === "g") return q / 28.3495;

  // Unknown conversion: assume 1
  return q;
}

export async function macroLookup(items: PortionedItem[]): Promise<MealEstimate> {
  const out: MacroItem[] = [];

  for (const p of items ?? []) {
    const cacheKey = JSON.stringify(p);
    const cached = macroCache.get(cacheKey);
    if (cached) { out.push(cached); continue; }

    const k = keyFrom(p);
    let item: MacroItem;

    if (k && REF[k]) {
      const ref = REF[k];
      const factor = toQuantityFactor(p, ref.unit);
      item = {
        name: p.name,
        quantity: p.quantity,
        unit: p.unit,
        calories: round1(ref.cals * factor),
        protein_g: round1(ref.p * factor),
        carbs_g: round1(ref.c * factor),
        fat_g: round1(ref.f * factor),
        fiber_g: round1(ref.fi * factor), // FIBER-FIRST
        confidence: p.confidence >= 0.9 ? 0.95 : 0.9,
        source: ref.source
      };
    } else {
      // Fallback with fiber = 0.0 unless we can infer otherwise
      item = {
        name: p.name,
        quantity: p.quantity,
        unit: p.unit,
        calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0,
        confidence: 0.6,
        source: "fallback"
      };
    }

    macroCache.set(cacheKey, item);
    out.push(item);
  }

  // Compute totals
  const totals: MealTotals = out.reduce((acc, i) => ({
    calories: round1(acc.calories + i.calories),
    protein_g: round1(acc.protein_g + i.protein_g),
    carbs_g: round1(acc.carbs_g + i.carbs_g),
    fat_g: round1(acc.fat_g + i.fat_g),
    fiber_g: round1(acc.fiber_g + i.fiber_g)
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });

  return { items: out, totals };
}

