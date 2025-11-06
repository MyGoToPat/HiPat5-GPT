-- Quick SQL to apply PERSONALITY_ROUTER to production
-- Run this in Supabase SQL Editor

-- Step 1: Upsert prompt
INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_ROUTER', 'published', 1, $$You are Pat's routing agent. Decide AMA vs role and whether Gemini is required.

Rules:
- Concept/explanation questions like "What are macros?" → intent: 'ama', route_to: 'ama', use_gemini: false, reason: 'conversational'
- Log this / I ate X / brand or fast-food macros → intent: 'tmwya', route_to: 'tmwya', use_gemini: true (for brand/fast-food), reason: 'role_task'
- Latest research / cite sources / 2024 study / "find" / "search" → intent: 'ama', route_to: 'ama', use_gemini: true, reason: 'requires_web_search'
- Route to 'tmwya' for food logging/questions. 'workout' for workout tracking. 'camera' for photo/barcode/label scans. Otherwise 'ama'.
- use_gemini = true for web search / "latest" / citations / brand/fast-food lookups / image parsing / barcode/label OCR.
- use_gemini = false when OpenAI + our DB can answer (USDA whole foods, user history, AMA chat without web).
- Output STRICT JSON ONLY using this schema:

{
  "intent": "ama" | "tmwya" | "workout" | "camera",
  "route_to": "ama" | "tmwya" | "workout" | "camera",
  "use_gemini": true | false,
  "reason": "database_can_answer" | "requires_web_search" | "requires_visual" | "conversational" | "role_task",
  "needs_clarification": true | false,
  "clarifier": "string or null",
  "confidence": 0.0
}

No prose.$$)
ON CONFLICT (agent_id, version) DO UPDATE SET content = EXCLUDED.content, status = 'published';

-- Step 2: Add to personality swarm config (idempotent)
UPDATE agent_configs
SET config = jsonb_set(
  config,
  '{agents}',
  (
    SELECT jsonb_agg(elem ORDER BY 
      CASE elem->>'phase' 
        WHEN 'pre' THEN 1 
        WHEN 'main' THEN 2 
        WHEN 'post' THEN 3 
        ELSE 4 
      END,
      (elem->>'order')::int
    )
    FROM jsonb_array_elements(
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM jsonb_array_elements(config->'agents') a
          WHERE a->>'promptRef' = 'PERSONALITY_ROUTER'
        )
        THEN config->'agents'
        ELSE (config->'agents') || jsonb_build_array(
          jsonb_build_object(
            'id', 'router-' || gen_random_uuid()::text,
            'name', 'Intelligent Router',
            'promptRef', 'PERSONALITY_ROUTER',
            'phase', 'pre',
            'order', 15,
            'enabled', true
          )
        )
      END
    ) elem
  )
)
WHERE agent_key = 'personality';

-- Verification queries
SELECT agent_id, status, version FROM agent_prompts WHERE agent_id='PERSONALITY_ROUTER';
SELECT jsonb_array_elements(config->'agents')->>'promptRef' AS ref
FROM agent_configs WHERE agent_key='personality'
ORDER BY (jsonb_array_elements(config->'agents')->>'order')::int;

