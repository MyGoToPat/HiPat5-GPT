-- ============================================================================
-- PHASE C VERIFICATION QUERIES
-- ============================================================================
--
-- Run these queries in Supabase SQL Editor after applying PHASE_C_MIGRATION.sql
-- Screenshot the results and share with Dwayne for approval
--
-- ============================================================================

-- Query 1: Verify all tables created
-- Expected: 7 rows (one for each table)
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema='public'
  AND table_name IN (
    'swarms',
    'swarm_versions',
    'swarm_agents',
    'agent_prompts',
    'agent_test_runs',
    'dietary_filter_rules',
    'app_feature_flags'
  )
ORDER BY table_name;

-- Query 2: Verify feature flags seeded
-- Expected: 3 rows with all values = true
SELECT key, value, description, updated_at
FROM app_feature_flags
ORDER BY key;

-- Query 3: Verify RLS enabled on all tables
-- Expected: 7 rows, all with rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'swarms',
    'swarm_versions',
    'swarm_agents',
    'agent_prompts',
    'agent_test_runs',
    'dietary_filter_rules',
    'app_feature_flags'
  )
ORDER BY tablename;

-- Query 4: Check swarms overview (should be empty until seeded)
-- Expected: 0 rows (no swarms created yet)
SELECT * FROM v_swarms_overview;

-- Query 5: Verify column types for swarm_versions
-- Expected: Shows manifest as jsonb, rollout_percent as integer, etc.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'swarm_versions'
ORDER BY ordinal_position;

-- Query 6: Test RLS policies (should fail if not admin)
-- Expected: Error if not service_role, success if admin
-- This tests that RLS is working correctly
SELECT COUNT(*) as swarms_count FROM swarms;
