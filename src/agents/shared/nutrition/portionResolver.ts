import type { PortionedItem } from "./types";

type RawItem = { 
  name: string; 
  amount: number | null; 
  unit: string | null; 
  notes?: string | null;
  // Brand fields (preserved from sanitizer)
  brand?: string | null;
  serving_label?: string | null;
  size_label?: string | null;
  is_branded?: boolean;
};

const UNIT_MAP: Record<string, string> = {
  piece: "piece", pieces: "piece", egg: "piece", eggs: "piece",
  cup: "cup", cups: "cup", tbsp: "tbsp", teaspoon: "tsp", tsp: "tsp",
  gram: "g", grams: "g", g: "g", kilogram: "g", kg: "g",
  ounce: "oz", ounces: "oz", oz: "oz", ml: "ml",
  slice: "slice", slices: "slice"
};

function normUnit(u: string | null): string | null {
  if (!u) return null;
  const k = u.trim().toLowerCase();
  return UNIT_MAP[k] ?? u.trim().toLowerCase();
}

export function portionResolver(raw: RawItem[]): PortionedItem[] {
  return (raw ?? []).map((it) => {
    const name = (it?.name ?? "").trim().toLowerCase();
    let quantity = it?.amount ?? null;
    let unit = normUnit(it?.unit ?? null);
    let confidence = 0.0;

    // Simple rules
    if (!unit) {
      if (/\begg(s)?\b/.test(name)) unit = "piece";
      if (/\b(sourdough|bread)\b/.test(name)) unit = "slice";
      if (/\boatmeal\b/.test(name)) unit = "cup";
      if (/\bmilk\b/.test(name)) unit = "cup";
      if (/\brice\b/.test(name)) unit = "cup";
      if (/\byogurt\b/.test(name)) unit = "cup";
      if (/\bbroccoli\b/.test(name)) unit = "cup";
      if (/\bspinach\b/.test(name)) unit = "cup";
      if (/\bbanana\b/.test(name)) unit = "piece";
      if (/\bapple\b/.test(name)) unit = "piece";
    }

    let reason: string | undefined = undefined;
    
    if (quantity !== null && unit) {
      confidence = 1.0;
    } else if (quantity === null && unit) {
      confidence = 0.9;
      reason = "Missing quantity";
    } else {
      confidence = 0.0;
      reason = "Missing both quantity and unit";
    }

    // Preserve brand fields if present
    return { 
      name, 
      quantity, 
      unit, 
      confidence, 
      reason,
      brand: it?.brand ?? null,
      serving_label: it?.serving_label ?? null,
      size_label: it?.size_label ?? null,
      is_branded: it?.is_branded ?? false
    };
  });
}

