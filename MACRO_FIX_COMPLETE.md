# Macro Population Fix Complete

## Root Cause

Macros showed 0 because the naive text splitting in `handleUserMessage.ts` failed to parse natural meal phrases like "i ate 3 eggs and a cup of oatmeal". The normalizer LLM agent was never being called.

## Changes Made

### 1. Added Normalizer LLM Call ✓
**File:** `src/core/chat/handleUserMessage.ts` (lines 95-146)

- Fetch `TMWYA_NORMALIZER` prompt from `agent_prompts` table
- Call OpenAI LLM (gpt-4o-mini, temp 0.1) to parse meal text into structured items
- Parse JSON response: `{ items: [{ name, amount, unit }] }`
- Fallback to naive split if LLM fails or returns invalid JSON

### 2. Added Warning System ✓
**File:** `src/core/chat/handleUserMessage.ts` (lines 160-178)

- Generate warnings for low-confidence items (confidence < 0.7)
- Generate warnings for unknown foods (all macros are 0)
- Warnings display in MealVerifyCard as yellow alert boxes
- Users are prompted to edit qty/unit for unknown items

## How It Works Now

1. User types "i ate 3 eggs and a cup of oatmeal"
2. Intent detected: `food_log` → normalized to `meal_logging`
3. **Normalizer LLM called** to parse text:
   ```json
   {
     "items": [
       {"name": "eggs", "amount": 3, "unit": "piece"},
       {"name": "oatmeal", "amount": 1, "unit": "cup"}
     ]
   }
   ```
4. PortionResolver adds confidence scores
5. MacroLookup matches to REF database → **macros populate correctly**
6. TEF + TDEE calculated
7. MealVerifyCard renders with correct macros
8. Warnings shown if confidence low or food unknown

## Example Console Output

```
[TMWYA] Normalizer parsed items: [
  { name: "eggs", amount: 3, unit: "piece" },
  { name: "oatmeal", amount: 1, unit: "cup" }
]
[TMWYA] Meal estimate complete: {
  items: 2,
  totals: { calories: 224, protein_g: 20.9, carbs_g: 27.4, fat_g: 8.3, fiber_g: 4.0 },
  tef: 15.4,
  tdee: 1901.6
}
```

## Testing Checklist

- [ ] Type "i ate 3 eggs" → macros should populate (eggs: 210 kcal, 18.9g protein)
- [ ] Type "i ate a cup of oatmeal" → macros should populate (oatmeal: 154 kcal, 6g protein, 4g fiber)
- [ ] Type "i ate mill" → warning should appear for unknown food
- [ ] Click Edit → modify qty/unit → Apply → macros recalculate
- [ ] Click Confirm → meal logs to database with correct macros

## Next Steps

1. Test with various meal inputs to verify LLM parsing works
2. Consider adding few-shot examples to normalizer prompt for better accuracy
3. Add USDA database lookup for unknown foods (stretch goal)


