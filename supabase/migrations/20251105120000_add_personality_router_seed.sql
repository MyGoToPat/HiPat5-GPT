/*
  # Add PERSONALITY_ROUTER Agent to Personality Swarm
  
  Phase 1: DB Seed
  - Upserts PERSONALITY_ROUTER prompt into agent_prompts
  - Adds PERSONALITY_ROUTER agent entry to agent_configs.config->agents array
  - Ensures router appears in Admin UI between Voice (order=10) and Audience (order=20)
*/

-- Step 1: Upsert PERSONALITY_ROUTER prompt (idempotent)
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
ON CONFLICT (agent_id, version) DO NOTHING;

-- Step 2: Add PERSONALITY_ROUTER to personality swarm config->agents array (idempotent)
-- This function safely adds the router agent if it doesn't already exist
DO $$
DECLARE
  config_json jsonb;
  agents_array jsonb;
  router_exists boolean;
BEGIN
  -- Get current config
  SELECT config INTO config_json
  FROM agent_configs
  WHERE agent_key = 'personality'
  FOR UPDATE;
  
  IF config_json IS NULL THEN
    RAISE EXCEPTION 'agent_configs entry for "personality" not found';
  END IF;
  
  -- Extract agents array
  agents_array := config_json->'agents';
  
  -- Check if router already exists
  router_exists := EXISTS (
    SELECT 1 FROM jsonb_array_elements(agents_array) agent
    WHERE agent->>'promptRef' = 'PERSONALITY_ROUTER'
  );
  
  -- Only add if not present
  IF NOT router_exists THEN
    -- Add router agent with order=15 (between Voice=10 and Audience=20)
    agents_array := agents_array || jsonb_build_array(
      jsonb_build_object(
        'id', 'router-' || gen_random_uuid()::text,
        'name', 'Intelligent Router',
        'promptRef', 'PERSONALITY_ROUTER',
        'phase', 'pre',
        'order', 15,
        'enabled', true
      )
    );
    
    -- Sort agents by phase then order
    agents_array := (
      SELECT jsonb_agg(elem ORDER BY 
        CASE elem->>'phase' 
          WHEN 'pre' THEN 1 
          WHEN 'main' THEN 2 
          WHEN 'post' THEN 3 
          ELSE 4 
        END,
        (elem->>'order')::int
      )
      FROM jsonb_array_elements(agents_array) elem
    );
    
    -- Update config
    UPDATE agent_configs
    SET config = jsonb_set(config_json, '{agents}', agents_array)
    WHERE agent_key = 'personality';
    
    RAISE NOTICE 'Added PERSONALITY_ROUTER to personality swarm config';
  ELSE
    RAISE NOTICE 'PERSONALITY_ROUTER already exists in personality swarm config';
  END IF;
END $$;

