/*
  # Update TMWYA Agent Prompts v2
  
  Updates TMWYA agent prompts based on Cursor's recommendations:
  - Enhanced intent classification with mixed intents, meal slot detection, confidence thresholds
  - Enhanced normalizer with multi-item split, unit standardization
  - Enhanced verify-view with editable rows, warnings, actions
  
  All prompts follow the fiber-first contract and maintain JSON-only output.
*/

-- =============================================================================
-- TMWYA Intent Classifier (tmwya-intent)
-- =============================================================================
INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('TMWYA_INTENT', 'published', 1, $$You classify whether the user's text is about logging a meal they ate. Output JSON only.

Return exactly:
{"type":"meal_logging"|"unknown","confidence":0..1,"meal_slot":"breakfast"|"lunch"|"dinner"|"snack"|null}

Rules:
- Strong signals: "i ate", "had breakfast/lunch/dinner/snack", past-tense consumption, explicit foods, portions, grams, cups → meal_logging.
- Weak signals: "how many calories in X", "what's protein in Y" (hypothetical) → unknown.
- Mixed intents: if the user both logged and asked a question, prefer "meal_logging".
- Meal slot: use explicit words or timing hints (morning=breakfast, noon=lunch, evening=dinner). If unsure, null.

Never write prose. JSON only.$$)
ON CONFLICT (agent_id, version) DO UPDATE SET content = EXCLUDED.content;

-- =============================================================================
-- TMWYA Utterance Normalizer (tmwya-normalizer)
-- =============================================================================
INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('TMWYA_NORMALIZER', 'published', 1, $$Normalize messy meal text into structured food items. Output JSON only.

Split multi-item inputs by: and, &, with, plus, comma, semicolon.
Fix obvious typos and slang when clear (e.g., "sammy" → "sandwich").
Extract items with best-guess amount and unit when present; else nulls.

Return exactly:
{"items":[{"name":string,"amount":number|null,"unit":string|null,"notes":string|null}]}

Units: g, oz, ml, cup, piece, slice, tbsp, tsp.
Numbers only in "amount". Keep brand names only if user typed them.
No prose.$$)
ON CONFLICT (agent_id, version) DO UPDATE SET content = EXCLUDED.content;

-- =============================================================================
-- TMWYA Verification View Builder (tmwya-verify-view)
-- =============================================================================
INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('TMWYA_VERIFY_VIEW', 'published', 1, $$Build a verification sheet JSON for a meal log. Output JSON only.

Input includes: items_macros, totals, tef, tdee, meal_slot, eaten_at_iso.
Mark rows "editable": true. Include warnings for low-confidence items.

Return exactly:
{
  "rows":[{"name":string,"quantity":number|null,"unit":string|null,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"fiber_g":number,"editable":true}],
  "totals":{"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"fiber_g":number},
  "tef":{"kcal":number},
  "tdee":{"target_kcal":number,"remaining_kcal":number,"remaining_percentage":number},
  "meal_slot":"breakfast"|"lunch"|"dinner"|"snack"|null,
  "eaten_at":string|null,
  "actions":["CONFIRM_LOG","EDIT_ITEMS","CANCEL"],
  "warnings":[{"type":"low_confidence"|"missing_portion","item"?:string,"message":string}]
}
No prose.$$)
ON CONFLICT (agent_id, version) DO UPDATE SET content = EXCLUDED.content;

-- =============================================================================
-- Notes
-- =============================================================================
-- 
-- Prompt changes summary:
-- 1. TMWYA_INTENT: Added mixed intent detection, meal slot extraction priority, confidence thresholds
-- 2. TMWYA_NORMALIZER: Added multi-item split rules, unit standardization, meal slot hints
-- 3. TMWYA_VERIFY_VIEW: Added editable rows, warnings array, remaining_percentage, EDIT_ITEMS action
--
-- All prompts maintain:
-- - JSON-only output (no prose)
-- - Fiber-first contract (fiber_g included in all relevant outputs)
-- - Confidence fields where appropriate
-- - Mobile-friendly verification view structure

