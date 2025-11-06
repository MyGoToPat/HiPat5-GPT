-- Verification SQL for PERSONALITY_ROUTER presence
-- Run these queries to verify router is properly seeded

-- Check 1: PERSONALITY_ROUTER exists in agent_prompts
SELECT 
  agent_id, 
  status, 
  version,
  LENGTH(content) as content_length,
  LEFT(content, 50) as content_preview
FROM agent_prompts 
WHERE agent_id = 'PERSONALITY_ROUTER'
  AND status = 'published';

-- Expected: 1 row with version=1, content_length > 200

-- Check 2: PERSONALITY_ROUTER referenced in agent_configs
SELECT 
  agent_key,
  jsonb_array_length(config->'agents') as total_agents,
  jsonb_pretty(
    (SELECT agent FROM jsonb_array_elements(config->'agents') agent
     WHERE agent->>'promptRef' = 'PERSONALITY_ROUTER')
  ) as router_agent_config
FROM agent_configs 
WHERE agent_key = 'personality';

-- Expected: router_agent_config shows JSON object with:
--   name: "Intelligent Router"
--   promptRef: "PERSONALITY_ROUTER"
--   phase: "pre"
--   order: 15
--   enabled: true

-- Check 3: Verify router is between Voice (order=10) and Audience (order=20)
SELECT 
  agent->>'name' as agent_name,
  agent->>'promptRef' as prompt_ref,
  agent->>'phase' as phase,
  (agent->>'order')::int as order_index
FROM agent_configs,
     jsonb_array_elements(config->'agents') agent
WHERE agent_key = 'personality'
  AND (agent->>'promptRef' IN ('PERSONALITY_VOICE', 'PERSONALITY_ROUTER', 'PERSONALITY_AUDIENCE'))
ORDER BY (agent->>'order')::int;

-- Expected: Shows Voice (10), Router (15), Audience (20) in that order

-- Summary check (all three conditions)
SELECT 
  (SELECT COUNT(*) FROM agent_prompts WHERE agent_id = 'PERSONALITY_ROUTER' AND status = 'published') as prompt_exists,
  (SELECT COUNT(*) FROM agent_configs ac, jsonb_array_elements(ac.config->'agents') agent
   WHERE ac.agent_key = 'personality' AND agent->>'promptRef' = 'PERSONALITY_ROUTER') as config_referenced,
  CASE 
    WHEN (SELECT COUNT(*) FROM agent_prompts WHERE agent_id = 'PERSONALITY_ROUTER' AND status = 'published') > 0
      AND (SELECT COUNT(*) FROM agent_configs ac, jsonb_array_elements(ac.config->'agents') agent
           WHERE ac.agent_key = 'personality' AND agent->>'promptRef' = 'PERSONALITY_ROUTER') > 0
    THEN 'PASS'
    ELSE 'FAIL'
  END as verification_status;

-- Expected: verification_status = 'PASS'

