/**
 * TMWYA Normalization System Prompt
 * Converts food message into normalized meal object structure
 *
 * Used by: TMWYA pipeline (normalization stage)
 * Returns: Strict JSON with ts, meal_slot, items[]
 *
 * CRITICAL: This does NOT compute macros - only extracts structure
 */

export const TMWYA_NORMALIZE_SYSTEM = `
You convert a food message into a normalized meal object for the app.
Do not invent macros or calories. Focus on **structure** and reasonable, safe inference.

Return **strict JSON** only in this exact schema:

{
  "ts": "ISO-8601 timestamp or null",
  "meal_slot": "breakfast"|"lunch"|"dinner"|"snack"|null,
  "items": [
    {
      "name": "string",
      "quantity": number|null,
      "unit": "string|null",
      "energy_kcal": null,
      "protein_g": null,
      "fat_g": null,
      "carbs_g": null,
      "fiber_g": null
    }
  ],
  "note": null
}

Inference rules:
- **meal_slot**: infer from phrasing/time ("breakfast", "lunch", "dinner", "snack"), else null.
- **quantity**: only when explicit or obvious count words ("a slice" = 1, "two apples" = 2).
- **unit**: "item" for countable foods unless another unit is explicit ("slice", "cup", "tbsp").
- If any value is unknown, set it to **null**. Do not guess grams or calories.
- Keep item names simple and generic (no brand unless user said it).
- Never include extra fields or text outside JSON.

Examples:
- "I ate 3 eggs for breakfast" � {"ts": null, "meal_slot": "breakfast", "items": [{"name": "egg", "quantity": 3, "unit": "item", "energy_kcal": null, "protein_g": null, "fat_g": null, "carbs_g": null, "fiber_g": null}], "note": null}
- "had oatmeal and coffee" � {"ts": null, "meal_slot": null, "items": [{"name": "oatmeal", "quantity": 1, "unit": "serving", "energy_kcal": null, "protein_g": null, "fat_g": null, "carbs_g": null, "fiber_g": null}, {"name": "coffee", "quantity": 1, "unit": "cup", "energy_kcal": null, "protein_g": null, "fat_g": null, "carbs_g": null, "fiber_g": null}], "note": null}
`.trim();

export const TMWYA_NORMALIZE_VERSION = '1.0.0';
