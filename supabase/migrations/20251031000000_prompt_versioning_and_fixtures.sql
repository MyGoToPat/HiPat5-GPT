-- Migration: 20251031000000_prompt_versioning_and_fixtures.sql
-- Fixes blockers: FK references, RLS policies, prompt fixtures

-- ============================================================================
-- 1. Prompt Fixtures Table (for golden tests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_prompt_id UUID NOT NULL REFERENCES public.agent_prompts(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  expected_output JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prompt_fixtures_agent_id ON prompt_fixtures(agent_prompt_id);

-- ============================================================================
-- 2. Prompt Catalog View (slug → latest published version)
-- ============================================================================
CREATE OR REPLACE VIEW agent_prompts_latest_published AS
SELECT DISTINCT ON (agent_id)
  id,
  agent_id,
  title,
  content,
  model,
  phase,
  exec_order,
  version,
  status,
  created_at,
  updated_at,
  created_by,
  checksum
FROM public.agent_prompts
WHERE status = 'published'
ORDER BY agent_id, version DESC;

-- ============================================================================
-- 3. RLS Policies for prompt_fixtures
-- ============================================================================
ALTER TABLE prompt_fixtures ENABLE ROW LEVEL SECURITY;

-- Public read access for all fixtures
CREATE POLICY "prompt_fixtures_select_public"
  ON prompt_fixtures
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin-only write access
CREATE POLICY "prompt_fixtures_admin_insert"
  ON prompt_fixtures
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "prompt_fixtures_admin_update"
  ON prompt_fixtures
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

CREATE POLICY "prompt_fixtures_admin_delete"
  ON prompt_fixtures
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- ============================================================================
-- 4. Enhanced RLS Policies for agent_prompts (admin write with WITH CHECK)
-- ============================================================================
-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "agent_prompts_admin_all" ON agent_prompts;
DROP POLICY IF EXISTS "agent_prompts_admin_insert" ON agent_prompts;
DROP POLICY IF EXISTS "agent_prompts_admin_update" ON agent_prompts;
DROP POLICY IF EXISTS "agent_prompts_admin_delete" ON agent_prompts;

-- Admin-only INSERT
CREATE POLICY "agent_prompts_admin_insert"
  ON agent_prompts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Admin-only UPDATE
CREATE POLICY "agent_prompts_admin_update"
  ON agent_prompts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Admin-only DELETE
CREATE POLICY "agent_prompts_admin_delete"
  ON agent_prompts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Public read for published prompts (already exists, but ensure it's correct)
-- Note: The existing policy "agent_prompts_read_published" should cover this
-- If it doesn't exist, create it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'agent_prompts' 
    AND policyname = 'agent_prompts_read_published'
  ) THEN
    CREATE POLICY "agent_prompts_read_published"
      ON agent_prompts
      FOR SELECT
      TO anon, authenticated
      USING (status = 'published');
  END IF;
END $$;

-- ============================================================================
-- 5. Helper function to create new prompt version
-- ============================================================================
CREATE OR REPLACE FUNCTION create_prompt_version(
  p_agent_id TEXT,
  p_title TEXT,
  p_content TEXT,
  p_model TEXT DEFAULT 'gpt-4o-mini',
  p_phase TEXT DEFAULT 'core',
  p_exec_order INT DEFAULT 50,
  p_status TEXT DEFAULT 'draft',
  p_created_by UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  v_version INT;
  v_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM agent_prompts
  WHERE agent_id = p_agent_id;
  
  -- Insert new version
  INSERT INTO agent_prompts (
    agent_id, title, content, model, phase, exec_order, status, version, created_by
  )
  VALUES (
    p_agent_id, p_title, p_content, p_model, p_phase, p_exec_order, p_status, v_version, p_created_by
  )
  RETURNING id INTO v_id;
  
  -- Log admin action
  INSERT INTO admin_audit_log (
    admin_id, action, resource_type, resource_id, details
  )
  VALUES (
    p_created_by, 'create_prompt_version', 'agent_prompt', v_id::TEXT,
    jsonb_build_object('agent_id', p_agent_id, 'version', v_version)
  );
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Helper function to activate a prompt version
-- ============================================================================
CREATE OR REPLACE FUNCTION activate_prompt_version(
  p_agent_id TEXT,
  p_version INT,
  p_updated_by UUID DEFAULT auth.uid()
)
RETURNS VOID AS $$
BEGIN
  -- Unpublish all versions of this agent
  UPDATE agent_prompts
  SET status = 'draft', updated_at = NOW()
  WHERE agent_id = p_agent_id;
  
  -- Activate the specified version
  UPDATE agent_prompts
  SET status = 'published', updated_at = NOW()
  WHERE agent_id = p_agent_id AND version = p_version;
  
  -- Log admin action
  INSERT INTO admin_audit_log (
    admin_id, action, resource_type, resource_id, details
  )
  VALUES (
    p_updated_by, 'activate_prompt_version', 'agent_prompt', p_agent_id,
    jsonb_build_object('version', p_version)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Admin audit log table (if it doesn't exist)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "admin_audit_log_admin_read"
  ON admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- Service role can insert (for function calls)
CREATE POLICY "admin_audit_log_service_insert"
  ON admin_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);






