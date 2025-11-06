-- ========================================
-- TMWYA NORMALIZER: Preserve Exact Food Names
-- ========================================
-- This update ensures the normalizer LLM preserves user's exact food names
-- without simplifying them (e.g., "skim milk" NOT "milk", "sourdough bread" NOT "bread")
--
-- Run this in your Supabase SQL Editor to update the prompt
-- ========================================

-- Upsert a new published version of the TMWYA normalizer that preserves exact food names
WITH last AS (
  SELECT agent_id, title, model, phase, exec_order, version
  FROM public.agent_prompts
  WHERE agent_id = 'tmwya-normalizer' AND status = 'published'
  ORDER BY version DESC
  LIMIT 1
)
INSERT INTO public.agent_prompts
  (agent_id, title, content, model, phase, exec_order, status, version)
SELECT
  'tmwya-normalizer',
  COALESCE(last.title, 'TMWYA normalizer'),
  $content$
You are a food text normalizer. Parse messy meal descriptions into structured JSON.
Return JSON ONLY (no markdown):

{"items":[{"name":string,"amount":number|null,"unit":"piece|egg|cup|slice|g|oz|ml|null"}]}

Rules:
- Preserve exact food names verbatim. Never simplify or generalize names.
  Examples:
  • "sourdough bread" stays "sourdough bread" (NOT "bread")
  • "skim milk" stays "skim milk" (NOT "milk")
  • "3 large eggs" → name: "large eggs", amount: 3, unit: "piece"
- Split items by "and", "&", "with", "plus", commas, or semicolons.
- Extract numeric quantities (integers or decimals) when present; else amount = null.
- Extract units if explicit (piece/egg, cup, slice, g, oz, ml). Else unit = null.
- No extra fields. No explanations. No macros. Only the JSON.

Examples:
Input: "1 cup oatmeal, 1 cup skim milk, 2 slices sourdough bread"
Output: {"items":[
  {"name":"oatmeal","amount":1,"unit":"cup"},
  {"name":"skim milk","amount":1,"unit":"cup"},
  {"name":"sourdough bread","amount":2,"unit":"slice"}
]}
$content$,
  COALESCE(last.model, 'gpt-4o-mini'),
  COALESCE(last.phase, 'core'),
  COALESCE(last.exec_order, 50),
  'published',
  COALESCE(last.version, 0) + 1
FROM last
UNION ALL
SELECT
  'tmwya-normalizer',
  'TMWYA normalizer',
  $content$
You are a food text normalizer. Parse messy meal descriptions into structured JSON.
Return JSON ONLY (no markdown):

{"items":[{"name":string,"amount":number|null,"unit":"piece|egg|cup|slice|g|oz|ml|null"}]}

Rules:
- Preserve exact food names verbatim. Never simplify or generalize names.
  Examples:
  • "sourdough bread" stays "sourdough bread" (NOT "bread")
  • "skim milk" stays "skim milk" (NOT "milk")
  • "3 large eggs" → name: "large eggs", amount: 3, unit: "piece"
- Split items by "and", "&", "with", "plus", commas, or semicolons.
- Extract numeric quantities (integers or decimals) when present; else amount = null.
- Extract units if explicit (piece/egg, cup, slice, g, oz, ml). Else unit = null.
- No extra fields. No explanations. No macros. Only the JSON.

Examples:
Input: "1 cup oatmeal, 1 cup skim milk, 2 slices sourdough bread"
Output: {"items":[
  {"name":"oatmeal","amount":1,"unit":"cup"},
  {"name":"skim milk","amount":1,"unit":"cup"},
  {"name":"sourdough bread","amount":2,"unit":"slice"}
]}
$content$,
  'gpt-4o-mini',
  'core',
  50,
  'published',
  1
WHERE NOT EXISTS (SELECT 1 FROM last);

-- Verify the update
SELECT 
  agent_id, 
  version, 
  status, 
  title,
  LENGTH(content) as prompt_length,
  created_at
FROM public.agent_prompts
WHERE agent_id = 'tmwya-normalizer'
ORDER BY version DESC
LIMIT 5;

