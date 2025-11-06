-- Update TMWYA Prompts for Unified Nutrition Pipeline
-- Run this via Supabase SQL Editor or psql
-- Task 1: Fix normalizer and improve all TMWYA prompts

-- ============================================================================
-- 1. TMWYA-NORMALIZER (CRITICAL FIX)
-- ============================================================================
-- Problem: Current v2 prompt returns empty array
-- Solution: Updated prompt with clear JSON structure and examples

INSERT INTO agent_prompts (
  agent_id,
  title,
  content,
  model,
  phase,
  exec_order,
  status,
  version,
  created_by
)
VALUES (
  'tmwya-normalizer',
  'TMWYA Food Normalizer',
  'You are a food text normalizer. Parse messy meal descriptions into structured JSON.

**OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):**
```json
{
  "items": [
    {"name": "food_name", "amount": number_or_null, "unit": "unit_or_null"}
  ]
}
```

**RULES:**
1. Split on: commas, "and", "with", "plus"
2. Extract quantities: "3 eggs" → amount:3
3. Infer units when obvious:
   - eggs → "piece"
   - oatmeal, oats → "cup"
   - milk → "cup"
   - bread, toast, sourdough → "slice"
   - meat (chicken, beef, steak) → "oz"
4. If no quantity: amount:null
5. If no unit: unit:null
6. Clean names: "large eggs" → "eggs", "skim milk" → "milk"

**EXAMPLES:**

Input: "i ate 3 whole eggs"
Output: {"items":[{"name":"eggs","amount":3,"unit":"piece"}]}

Input: "1 cup oatmeal with 1/2 cup skim milk"
Output: {"items":[{"name":"oatmeal","amount":1,"unit":"cup"},{"name":"milk","amount":0.5,"unit":"cup"}]}

Input: "2 slices sourdough bread"
Output: {"items":[{"name":"bread","amount":2,"unit":"slice"}]}

Input: "10 oz ribeye steak"
Output: {"items":[{"name":"ribeye","amount":10,"unit":"oz"}]}

Input: "eggs and toast" (no quantities)
Output: {"items":[{"name":"eggs","amount":null,"unit":"piece"},{"name":"toast","amount":null,"unit":"slice"}]}

**CRITICAL:** Return ONLY the JSON object. No explanations, no markdown fences.',
  'gpt-4o-mini',
  'pre',
  5,
  'published',
  3,
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (agent_id, version) 
DO UPDATE SET
  content = EXCLUDED.content,
  status = 'published',
  updated_at = NOW();

-- ============================================================================
-- 2. TMWYA-INTENT (Improve detection)
-- ============================================================================

INSERT INTO agent_prompts (
  agent_id,
  title,
  content,
  model,
  phase,
  exec_order,
  status,
  version,
  created_by
)
VALUES (
  'tmwya-intent',
  'TMWYA Intent Classifier',
  'Classify if user text is about logging a meal they ate.

**OUTPUT (JSON ONLY):**
```json
{"type":"meal_logging"}
```
OR
```json
{"type":"not_meal"}
```

**MEAL_LOGGING signals:**
- "i ate", "i had", "i just ate"
- "for breakfast/lunch/dinner"
- "consumed", "finished"
- Past tense food mentions

**NOT_MEAL signals:**
- "what are the macros" (question about food, not logging)
- "tell me the nutrition"
- Future tense: "i will eat", "should i eat"
- General questions

**EXAMPLES:**

Input: "i ate 3 eggs"
Output: {"type":"meal_logging"}

Input: "what are the macros of 3 eggs"
Output: {"type":"not_meal"}

Input: "i had oatmeal for breakfast"
Output: {"type":"meal_logging"}

Input: "tell me the nutrition for oatmeal"
Output: {"type":"not_meal"}

Return ONLY the JSON. No explanations.',
  'gpt-4o-mini',
  'pre',
  0,
  'published',
  2,
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (agent_id, version) 
DO UPDATE SET
  content = EXCLUDED.content,
  status = 'published',
  updated_at = NOW();

-- ============================================================================
-- 3. TMWYA-VERIFY-VIEW (Improve formatting)
-- ============================================================================

INSERT INTO agent_prompts (
  agent_id,
  title,
  content,
  model,
  phase,
  exec_order,
  status,
  version,
  created_by
)
VALUES (
  'tmwya-verify-view',
  'TMWYA Verification Sheet Builder',
  'Build a verification sheet JSON for a meal log. Input: items_macros, totals, TEF, TDEE.

**OUTPUT FORMAT (JSON ONLY):**
```json
{
  "rows": [
    {
      "name": "food_name",
      "quantity": number_or_null,
      "unit": "unit_or_null",
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "editable": true
    }
  ],
  "totals": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number
  },
  "tef": {"kcal": number},
  "tdee": {
    "target_kcal": number,
    "remaining_kcal": number,
    "remaining_percentage": number
  },
  "meal_slot": null,
  "eaten_at": "ISO_timestamp",
  "actions": ["CONFIRM_LOG", "EDIT_ITEMS", "CANCEL"],
  "warnings": []
}
```

**RULES:**
1. ALWAYS include fiber_g (0 if missing)
2. Set editable:true for all rows
3. actions: 
   - ["CONFIRM_LOG","EDIT_ITEMS","CANCEL"] for meal logging
   - ["EDIT_ITEMS","CANCEL"] for info-only queries
4. warnings: Add if confidence<0.7 or unknown food

Return ONLY the JSON. No explanations.',
  'gpt-4o-mini',
  'post',
  40,
  'published',
  2,
  (SELECT id FROM auth.users LIMIT 1)
)
ON CONFLICT (agent_id, version) 
DO UPDATE SET
  content = EXCLUDED.content,
  status = 'published',
  updated_at = NOW();

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this after INSERT to verify:
SELECT 
  agent_id,
  version,
  status,
  model,
  phase,
  exec_order,
  LEFT(content, 100) as content_preview,
  created_at
FROM agent_prompts
WHERE agent_id IN ('tmwya-normalizer', 'tmwya-intent', 'tmwya-verify-view')
  AND status = 'published'
ORDER BY agent_id, version DESC;

