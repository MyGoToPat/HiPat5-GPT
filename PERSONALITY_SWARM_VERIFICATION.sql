/*
  # Personality Swarm Verification Queries

  Run these queries after deployment to verify the swarm system is correctly configured.

  Expected Results:
  - Query 1: 10 rows (one per PERSONALITY_* agent)
  - Query 2: 1 row with agent_count=10
  - Query 3: 2 rows (RLS policies for agent_prompts and agent_configs)
  - Query 4: 10 rows (detailed agent config)
*/

-- ============================================================================
-- Query 1: Verify all 10 personality agents exist and are published
-- ============================================================================
SELECT
  agent_id,
  status,
  version,
  LENGTH(content) as content_length,
  updated_at
FROM agent_prompts
WHERE agent_id LIKE 'PERSONALITY_%'
ORDER BY agent_id;

-- Expected: 10 rows, all status='published', version=1


-- ============================================================================
-- Query 2: Verify personality swarm configuration
-- ============================================================================
SELECT
  agent_key,
  config->>'swarm_name' as swarm_name,
  jsonb_array_length(config->'agents') as agent_count,
  updated_at
FROM agent_configs
WHERE agent_key = 'personality';

-- Expected: 1 row, swarm_name='personality', agent_count=10


-- ============================================================================
-- Query 3: Verify RLS policies are in place
-- ============================================================================
SELECT
  tablename,
  policyname,
  cmd,
  roles::text as roles
FROM pg_policies
WHERE tablename IN ('agent_prompts', 'agent_configs')
  AND policyname IN ('agent_prompts_read_published', 'agent_configs_read_personality')
ORDER BY tablename, policyname;

-- Expected: 2 rows
-- agent_prompts | agent_prompts_read_published | SELECT | {anon,authenticated}
-- agent_configs | agent_configs_read_personality | SELECT | {anon,authenticated}


-- ============================================================================
-- Query 4: Detailed agent configuration (human-readable)
-- ============================================================================
SELECT
  agents.value->>'id' as agent_id,
  agents.value->>'name' as agent_name,
  agents.value->>'phase' as phase,
  (agents.value->>'order')::int as exec_order,
  agents.value->>'enabled' as enabled,
  agents.value->>'promptRef' as prompt_ref
FROM agent_configs,
     jsonb_array_elements(config->'agents') as agents
WHERE agent_key = 'personality'
ORDER BY (agents.value->>'order')::int;

-- Expected: 10 rows in order:
-- PERSONALITY_VOICE       | Voice Calibrator    | pre  | 10
-- PERSONALITY_AUDIENCE    | Audience Detector   | pre  | 20
-- PERSONALITY_AMBIGUITY   | Clarifier Gate      | pre  | 30
-- PERSONALITY_CORE_RESPONDER | Main Responder   | main | 40
-- PERSONALITY_STRUCTURE   | Structure Governor  | post | 50
-- PERSONALITY_NUMBERS     | Numbers Echo        | post | 60
-- PERSONALITY_SAFETY      | Safety Filter       | post | 70
-- PERSONALITY_MEMORY      | Memory Manager      | post | 80
-- PERSONALITY_RECOVERY    | Error Recovery      | post | 90
-- PERSONALITY_TOOL_GOV    | Tool Governance     | post | 95


-- ============================================================================
-- Query 5: Test agent prompt loading (sample)
-- ============================================================================
SELECT
  agent_id,
  LEFT(content, 100) as content_preview,
  LENGTH(content) as content_length
FROM agent_prompts
WHERE agent_id = 'PERSONALITY_VOICE'
  AND status = 'published'
ORDER BY version DESC
LIMIT 1;

-- Expected: 1 row with content preview and length ~256 chars


-- ============================================================================
-- Query 6: Verify RLS is enabled on both tables
-- ============================================================================
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('agent_prompts', 'agent_configs')
  AND schemaname = 'public';

-- Expected: 2 rows, both with rls_enabled=true


-- ============================================================================
-- Query 7: Test anon role can read personality config (RLS check)
-- ============================================================================
-- This should be run with anon credentials, not service role
-- SET ROLE anon;  -- Uncomment if testing with psql
SELECT
  agent_key,
  jsonb_array_length(config->'agents') as agent_count
FROM agent_configs
WHERE agent_key = 'personality';

-- Expected: 1 row (if RLS is correct)
-- If this returns 0 rows with anon role, RLS policy is missing or incorrect


-- ============================================================================
-- TROUBLESHOOTING: If any query fails or returns unexpected results
-- ============================================================================

-- Check if migration was applied:
SELECT * FROM supabase_migrations.schema_migrations
WHERE version LIKE '%personality%'
ORDER BY version DESC;

-- Check if RLS policies exist:
SELECT * FROM pg_policies
WHERE tablename IN ('agent_prompts', 'agent_configs');

-- Check if tables exist:
SELECT tablename FROM pg_tables
WHERE tablename IN ('agent_prompts', 'agent_configs')
AND schemaname = 'public';
