-- ===============================================
-- P1 Admin & Filters - Verification Queries
-- Run these in Supabase SQL Editor and screenshot results
-- ===============================================

-- Query 1: Verify all new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN (
    'swarms',
    'agent_prompts',
    'swarm_agents',
    'swarm_versions',
    'agent_test_runs',
    'dietary_filter_rules'
  )
ORDER BY table_name;

-- Expected: 6 rows

-- Query 2: Verify RLS is enabled on all config tables
SELECT relname as table_name, relrowsecurity as rls_enabled
FROM pg_class
JOIN pg_namespace n ON n.oid = relnamespace
WHERE n.nspname='public'
  AND relname IN (
    'swarms',
    'agent_prompts',
    'swarm_agents',
    'swarm_versions',
    'agent_test_runs',
    'dietary_filter_rules'
  )
ORDER BY relname;

-- Expected: 6 rows with rls_enabled = true

-- Query 3: Verify RLS policies exist (service_role only)
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN (
    'swarms',
    'agent_prompts',
    'swarm_agents',
    'swarm_versions',
    'agent_test_runs',
    'dietary_filter_rules'
  )
ORDER BY tablename, policyname;

-- Expected: 6 rows (one policy per table)

-- Query 4: Verify seeded dietary filter rules
SELECT type, condition
FROM public.dietary_filter_rules
ORDER BY type;

-- Expected: 3 rows (keto, low_carb, carnivore)

-- Query 5: Verify user_preferences has new dietary columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name='user_preferences'
  AND column_name IN (
    'diet_type',
    'macro_overrides',
    'allergens',
    'religious_restrictions'
  )
ORDER BY column_name;

-- Expected: 4 rows showing new columns

-- Query 6: Test publish_swarm_version function (dry run)
-- Step 1: Create a test swarm
INSERT INTO public.swarms(id, name, description, enabled)
VALUES ('test.swarm', 'Test Swarm', 'For verification only', false)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create a draft version
INSERT INTO public.swarm_versions(swarm_id, status, manifest, rollout_percent)
VALUES ('test.swarm', 'draft', '{"agents": []}'::jsonb, 0)
RETURNING id;

-- Copy the returned ID and use it in the next query:
-- SELECT public.publish_swarm_version('<paste-uuid-here>');

-- Expected: Function executes without error, version status changes to 'published'

-- Query 7: Test get_active_swarm_manifest function
SELECT public.get_active_swarm_manifest('test.swarm');

-- Expected: Returns the published manifest JSON or null if none published

-- Query 8: Verify indexes were created
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_agent_prompts_agent_phase_order',
    'idx_swarm_agents_swarm_phase_order',
    'idx_swarm_versions_swarm_status',
    'idx_dietary_filter_rules_type'
  )
ORDER BY indexname;

-- Expected: 4 rows

-- Query 9: Verify triggers exist
SELECT
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'tg_touch_swarms',
    'tg_touch_agent_prompts',
    'tg_touch_dietary_filter_rules'
  )
ORDER BY trigger_name;

-- Expected: 3 rows

-- Query 10: Count all objects created by migration
SELECT
  'Tables' as object_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN (
    'swarms', 'agent_prompts', 'swarm_agents',
    'swarm_versions', 'agent_test_runs', 'dietary_filter_rules'
  )
UNION ALL
SELECT
  'Indexes' as object_type,
  COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'swarms', 'agent_prompts', 'swarm_agents',
    'swarm_versions', 'agent_test_runs', 'dietary_filter_rules'
  )
UNION ALL
SELECT
  'Policies' as object_type,
  COUNT(*)
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN (
    'swarms', 'agent_prompts', 'swarm_agents',
    'swarm_versions', 'agent_test_runs', 'dietary_filter_rules'
  )
UNION ALL
SELECT
  'Functions' as object_type,
  COUNT(*)
FROM pg_proc
WHERE proname IN ('publish_swarm_version', 'get_active_swarm_manifest')
UNION ALL
SELECT
  'Triggers' as object_type,
  COUNT(*)
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'tg_touch_swarms',
    'tg_touch_agent_prompts',
    'tg_touch_dietary_filter_rules'
  );

-- Expected summary:
-- Tables: 6
-- Indexes: 4
-- Policies: 6
-- Functions: 2
-- Triggers: 3

-- ===============================================
-- END VERIFICATION QUERIES
-- ===============================================
