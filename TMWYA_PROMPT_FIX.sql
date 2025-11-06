--  ================================================================
-- TMWYA PROMPT FIX - Copy/Paste into Supabase SQL Editor
-- ================================================================
-- This fixes the normalizer prompt that's returning empty arrays
-- Run this, then refresh your browser and test
-- ================================================================

-- 1. Update tmwya-normalizer to v3 (CRITICAL FIX)
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
{
  "items": [
    {"name": "food_name", "amount": number_or_null, "unit": "unit_or_null"}
  ]
}

**RULES:**
1. Split on: commas, "and", "with", "plus"
2. Extract quantities: "3 eggs" → amount:3
3. Infer units when obvious:
   - eggs → "piece"
   - oatmeal, oats → "cup"
   - milk → "cup"
   - bread, toast, sourdough → "slice"
   - meat (chicken, beef, steak, ribeye) → "oz"
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
  auth.uid()
);

-- Verify the update
SELECT 
  agent_id,
  version,
  status,
  LENGTH(content) as content_length,
  LEFT(content, 80) as preview
FROM agent_prompts
WHERE agent_id = 'tmwya-normalizer'
ORDER BY version DESC
LIMIT 3;

