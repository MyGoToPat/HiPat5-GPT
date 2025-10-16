-- ============================================================================
-- PHASE C: Enhanced Swarms Scaffolding (Safe, Non-Breaking)
-- ============================================================================
--
-- Summary:
-- Creates versioned swarm system tables for enhanced admin UI.
-- Includes draft → publish → rollout workflow with cohort targeting.
--
-- New Tables:
-- - swarms: Core swarm definitions (macro, tmwya, mmb, persona)
-- - swarm_versions: Versioned manifests with rollout controls
-- - swarm_agents: Agent membership per swarm (phase + order)
-- - agent_prompts: Editable prompt library (versioned)
-- - agent_test_runs: Test execution history
-- - dietary_filter_rules: Filter rules for TMWYA
-- - app_feature_flags: Simple boolean flags for UI toggles
--
-- Security:
-- - All tables enable RLS
-- - Admin-only access (service_role or custom admin check)
--
-- Data Safety:
-- - No DROP or DELETE operations
-- - No modifications to existing tables
-- - Idempotent: IF NOT EXISTS on all creates
--
-- Notes:
-- - Rollout defaults to 0% (no user impact)
-- - Feature flags default OFF
-- - Compatible with existing agents/agent_versions tables
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Core Enhanced Swarms Tables
-- ============================================================================

-- Swarms: High-level swarm definitions
CREATE TABLE IF NOT EXISTS swarms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  default_model text DEFAULT 'gpt-4o-mini',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE swarms IS 'High-level swarm definitions (macro, tmwya, mmb, persona)';

-- Swarm Versions: Draft → Publish → Rollout workflow
CREATE TABLE IF NOT EXISTS swarm_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swarm_id uuid NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('draft','published','archived')),
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollout_percent int NOT NULL DEFAULT 0 CHECK (rollout_percent BETWEEN 0 AND 100),
  cohort text NOT NULL DEFAULT 'beta' CHECK (cohort IN ('beta','paid','all')),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz
);

COMMENT ON TABLE swarm_versions IS 'Versioned swarm manifests with rollout controls';
COMMENT ON COLUMN swarm_versions.manifest IS 'JSON manifest: {phases: [], agents: [], protected_fields: []}';
COMMENT ON COLUMN swarm_versions.rollout_percent IS 'Percentage of cohort to receive this version (0-100)';
COMMENT ON COLUMN swarm_versions.cohort IS 'Target user cohort: beta, paid, or all';

-- Swarm Agents: Agent membership per swarm
CREATE TABLE IF NOT EXISTS swarm_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swarm_id uuid NOT NULL REFERENCES swarms(id) ON DELETE CASCADE,
  agent_key text NOT NULL,
  phase text NOT NULL CHECK (phase IN ('pre','core','filter','presenter','render','post')),
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE swarm_agents IS 'Agent membership and execution order per swarm';
COMMENT ON COLUMN swarm_agents.phase IS 'Execution phase: pre, core, filter, presenter, render, post';
COMMENT ON COLUMN swarm_agents.order_index IS 'Execution order within phase (lower runs first)';

CREATE INDEX IF NOT EXISTS idx_swarm_agents_swarm_phase ON swarm_agents(swarm_id, phase, order_index);

-- Agent Prompts: Editable prompt library (versioned)
CREATE TABLE IF NOT EXISTS agent_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL,
  version int NOT NULL DEFAULT 1,
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  prompt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_key, version)
);

COMMENT ON TABLE agent_prompts IS 'Versioned prompt library for agents (editable in admin)';

-- Agent Test Runs: Test execution history
CREATE TABLE IF NOT EXISTS agent_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swarm_version_id uuid NOT NULL REFERENCES swarm_versions(id) ON DELETE CASCADE,
  input_text text NOT NULL,
  output_json jsonb,
  error_message text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agent_test_runs IS 'Test execution history for swarm versions';

CREATE INDEX IF NOT EXISTS idx_agent_test_runs_version ON agent_test_runs(swarm_version_id, created_at DESC);

-- Dietary Filter Rules: Filter rules for TMWYA
CREATE TABLE IF NOT EXISTS dietary_filter_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_json jsonb NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE dietary_filter_rules IS 'Dietary filter rules for TMWYA swarm';
COMMENT ON COLUMN dietary_filter_rules.rule_json IS 'Filter rule definition: {type, conditions, actions}';

-- App Feature Flags: Simple boolean flags for UI toggles
CREATE TABLE IF NOT EXISTS app_feature_flags (
  key text PRIMARY KEY,
  value boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE app_feature_flags IS 'Simple boolean flags for UI feature toggles';

-- Seed initial feature flags
INSERT INTO app_feature_flags(key, value, description)
VALUES
  ('admin.swarmsLegacy', true, 'Show legacy Agent Config page in admin'),
  ('admin.swarmsEnhanced', true, 'Show enhanced Swarm Versions page in admin'),
  ('router.personaDefault', true, 'Always default to persona (AMA) when no domain match')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Row Level Security (Admin-Only Access)
-- ============================================================================

ALTER TABLE swarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE swarm_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE swarm_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_filter_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_feature_flags ENABLE ROW LEVEL SECURITY;

-- Create policies (admin-only for now - can be refined later)
DO $$
BEGIN
  -- Drop existing policies if they exist (for re-running migration)
  DROP POLICY IF EXISTS admin_all ON swarms;
  DROP POLICY IF EXISTS admin_all ON swarm_versions;
  DROP POLICY IF EXISTS admin_all ON swarm_agents;
  DROP POLICY IF EXISTS admin_all ON agent_prompts;
  DROP POLICY IF EXISTS admin_all ON agent_test_runs;
  DROP POLICY IF EXISTS admin_all ON dietary_filter_rules;
  DROP POLICY IF EXISTS admin_all ON app_feature_flags;

  -- Create permissive policies for service role (admin access)
  CREATE POLICY admin_all ON swarms FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

  CREATE POLICY admin_all ON swarm_versions FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

  CREATE POLICY admin_all ON swarm_agents FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

  CREATE POLICY admin_all ON agent_prompts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

  CREATE POLICY admin_all ON agent_test_runs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

  CREATE POLICY admin_all ON dietary_filter_rules FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

  CREATE POLICY admin_all ON app_feature_flags FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
END$$;

-- ============================================================================
-- Helper Views (Optional - for admin debugging)
-- ============================================================================

CREATE OR REPLACE VIEW v_swarms_overview AS
SELECT
  s.id,
  s.slug,
  s.name,
  s.enabled,
  (SELECT COUNT(*) FROM swarm_versions sv WHERE sv.swarm_id = s.id) as version_count,
  (SELECT COUNT(*) FROM swarm_versions sv WHERE sv.swarm_id = s.id AND sv.status = 'published') as published_count,
  (SELECT sv.rollout_percent FROM swarm_versions sv WHERE sv.swarm_id = s.id AND sv.status = 'published' ORDER BY sv.published_at DESC LIMIT 1) as current_rollout_pct
FROM swarms s
ORDER BY s.slug;

COMMENT ON VIEW v_swarms_overview IS 'Admin overview of all swarms with version/rollout summary';

-- ============================================================================
-- Verification Queries (Run these after migration to confirm success)
-- ============================================================================

-- 1) Verify all tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public'
--   AND table_name IN ('swarms','swarm_versions','swarm_agents','agent_prompts','agent_test_runs','dietary_filter_rules','app_feature_flags')
-- ORDER BY table_name;

-- 2) Verify feature flags seeded
-- SELECT * FROM app_feature_flags ORDER BY key;

-- 3) Verify RLS enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('swarms','swarm_versions','swarm_agents','agent_prompts','agent_test_runs','dietary_filter_rules','app_feature_flags');

-- 4) Check swarms overview (should be empty until seeded)
-- SELECT * FROM v_swarms_overview;
