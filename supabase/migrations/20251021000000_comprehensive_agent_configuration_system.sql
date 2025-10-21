/*
  # Comprehensive Agent Configuration System

  Enhances the existing agent/swarm system with full configuration capabilities
  for every agent in every swarm. Enables fine-tuning, performance tracking,
  token usage monitoring, and swarm optimization.

  1. Enhanced Tables
    - Extended agent_prompts with comprehensive config fields
    - agent_config_templates for reusable configurations
    - agent_performance_metrics for tracking latency, tokens, success rates
    - agent_test_runs enhanced for comprehensive testing
    - agent_token_usage for detailed token tracking
    - swarm_testing_sessions for safe rollout testing

  2. Security
    - All tables admin-only access via RLS
    - No impact on existing production users
    - Safe default values for all new columns

  3. Features
    - Individual agent prompt optimization
    - Model selection, temperature, max_tokens per agent
    - Performance analytics and bottleneck identification
    - Token usage tracking (free vs paid tokens)
    - Voice agent support for Pat's personality
    - Safe testing framework with rollout controls

  4. Notes
    - Backward compatible with existing agent_prompts
    - Uses rollout_percent=0 by default (no user impact)
    - Admin-only interface for all configuration
*/

-- ============================================================================
-- PART 1: Enhanced Agent Configuration
-- ============================================================================

-- Extend agent_prompts with comprehensive configuration
ALTER TABLE public.agent_prompts
  ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  ADD COLUMN IF NOT EXISTS max_tokens INT DEFAULT 1000 CHECK (max_tokens > 0 AND max_tokens <= 16000),
  ADD COLUMN IF NOT EXISTS response_format TEXT DEFAULT 'text' CHECK (response_format IN ('text', 'json', 'structured')),
  ADD COLUMN IF NOT EXISTS timeout_ms INT DEFAULT 30000 CHECK (timeout_ms > 0),
  ADD COLUMN IF NOT EXISTS retry_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_retries INT DEFAULT 2 CHECK (max_retries >= 0 AND max_retries <= 5),
  ADD COLUMN IF NOT EXISTS fallback_behavior TEXT DEFAULT 'error' CHECK (fallback_behavior IN ('error', 'skip', 'default')),
  ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_type TEXT DEFAULT 'llm' CHECK (agent_type IN ('llm', 'rule', 'code', 'template', 'voice')),
  ADD COLUMN IF NOT EXISTS voice_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cost_estimate_cents DECIMAL(10,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_latency_ms INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5,2) DEFAULT 100.00 CHECK (success_rate >= 0 AND success_rate <= 100);

-- Create agent configuration templates
CREATE TABLE IF NOT EXISTS public.agent_config_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('routing', 'processing', 'filtering', 'presentation', 'logging', 'voice')),
  template_config JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent performance metrics
CREATE TABLE IF NOT EXISTS public.agent_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_prompt_id UUID REFERENCES public.agent_prompts(id) ON DELETE CASCADE,
  execution_time_ms INT NOT NULL,
  token_usage_input INT DEFAULT 0,
  token_usage_output INT DEFAULT 0,
  token_usage_total INT DEFAULT 0,
  cost_cents DECIMAL(10,4) DEFAULT 0,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  model_used TEXT,
  swarm_id TEXT REFERENCES public.swarms(id) ON DELETE SET NULL,
  user_id UUID,
  session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent token usage tracking
CREATE TABLE IF NOT EXISTS public.agent_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_prompt_id UUID REFERENCES public.agent_prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tokens_used INT NOT NULL,
  tokens_source TEXT NOT NULL CHECK (tokens_source IN ('free', 'paid')),
  cost_cents DECIMAL(10,4) DEFAULT 0,
  swarm_id TEXT REFERENCES public.swarms(id) ON DELETE SET NULL,
  session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create swarm testing sessions
CREATE TABLE IF NOT EXISTS public.swarm_testing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swarm_version_id UUID REFERENCES public.swarm_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  test_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  status TEXT NOT NULL CHECK (status IN ('draft', 'running', 'completed', 'failed')) DEFAULT 'draft',
  rollout_percent INT NOT NULL DEFAULT 0 CHECK (rollout_percent >= 0 AND rollout_percent <= 100),
  cohort TEXT DEFAULT 'beta' CHECK (cohort IN ('beta', 'paid', 'all')),
  results JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agent dependencies tracking
CREATE TABLE IF NOT EXISTS public.agent_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_prompt_id UUID REFERENCES public.agent_prompts(id) ON DELETE CASCADE,
  depends_on_agent_id UUID REFERENCES public.agent_prompts(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL CHECK (dependency_type IN ('required', 'optional', 'conditional')),
  dependency_field TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_prompt_id, depends_on_agent_id)
);

-- ============================================================================
-- PART 2: Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_agent_prompts_agent_type ON public.agent_prompts(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_prompts_model ON public.agent_prompts(model);
CREATE INDEX IF NOT EXISTS idx_agent_prompts_status_version ON public.agent_prompts(status, version);

CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_agent ON public.agent_performance_metrics(agent_prompt_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_swarm ON public.agent_performance_metrics(swarm_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_created ON public.agent_performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_performance_metrics_success ON public.agent_performance_metrics(success);

CREATE INDEX IF NOT EXISTS idx_agent_token_usage_agent ON public.agent_token_usage(agent_prompt_id);
CREATE INDEX IF NOT EXISTS idx_agent_token_usage_user ON public.agent_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_token_usage_source ON public.agent_token_usage(tokens_source);
CREATE INDEX IF NOT EXISTS idx_agent_token_usage_created ON public.agent_token_usage(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swarm_testing_sessions_version ON public.swarm_testing_sessions(swarm_version_id);
CREATE INDEX IF NOT EXISTS idx_swarm_testing_sessions_status ON public.swarm_testing_sessions(status);

CREATE INDEX IF NOT EXISTS idx_agent_dependencies_agent ON public.agent_dependencies(agent_prompt_id);
CREATE INDEX IF NOT EXISTS idx_agent_dependencies_depends ON public.agent_dependencies(depends_on_agent_id);

-- ============================================================================
-- PART 3: RLS Policies (Admin-only access)
-- ============================================================================

ALTER TABLE public.agent_config_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_testing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_dependencies ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for all new tables
DO $$
BEGIN
  -- agent_config_templates
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'agent_config_templates'
    AND policyname = 'Admins can manage agent templates'
  ) THEN
    CREATE POLICY "Admins can manage agent templates"
      ON public.agent_config_templates
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- agent_performance_metrics (service role can write, admins can read)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'agent_performance_metrics'
    AND policyname = 'Service role can write metrics'
  ) THEN
    CREATE POLICY "Service role can write metrics"
      ON public.agent_performance_metrics
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'agent_performance_metrics'
    AND policyname = 'Admins can read metrics'
  ) THEN
    CREATE POLICY "Admins can read metrics"
      ON public.agent_performance_metrics
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- agent_token_usage
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'agent_token_usage'
    AND policyname = 'Service role can track token usage'
  ) THEN
    CREATE POLICY "Service role can track token usage"
      ON public.agent_token_usage
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.role() = 'service_role' OR EXISTS (
        SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'agent_token_usage'
    AND policyname = 'Admins can read token usage'
  ) THEN
    CREATE POLICY "Admins can read token usage"
      ON public.agent_token_usage
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- swarm_testing_sessions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'swarm_testing_sessions'
    AND policyname = 'Admins can manage testing sessions'
  ) THEN
    CREATE POLICY "Admins can manage testing sessions"
      ON public.swarm_testing_sessions
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;

  -- agent_dependencies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'agent_dependencies'
    AND policyname = 'Admins can manage agent dependencies'
  ) THEN
    CREATE POLICY "Admins can manage agent dependencies"
      ON public.agent_dependencies
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 4: Helper Functions
-- ============================================================================

-- Function to calculate agent performance statistics
CREATE OR REPLACE FUNCTION public.get_agent_performance_stats(p_agent_prompt_id UUID, p_days INT DEFAULT 7)
RETURNS TABLE (
  avg_latency_ms NUMERIC,
  total_executions BIGINT,
  success_rate NUMERIC,
  total_tokens INT,
  total_cost_cents NUMERIC,
  p95_latency_ms NUMERIC
) LANGUAGE SQL STABLE AS $$
  SELECT
    ROUND(AVG(execution_time_ms), 2) as avg_latency_ms,
    COUNT(*) as total_executions,
    ROUND(AVG(CASE WHEN success THEN 100 ELSE 0 END), 2) as success_rate,
    COALESCE(SUM(token_usage_total), 0)::INT as total_tokens,
    ROUND(COALESCE(SUM(cost_cents), 0), 4) as total_cost_cents,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms), 2) as p95_latency_ms
  FROM public.agent_performance_metrics
  WHERE agent_prompt_id = p_agent_prompt_id
    AND created_at >= (now() - (p_days || ' days')::interval)
$$;

-- Function to get swarm performance overview
CREATE OR REPLACE FUNCTION public.get_swarm_performance_overview(p_swarm_id TEXT, p_days INT DEFAULT 7)
RETURNS TABLE (
  agent_id TEXT,
  agent_title TEXT,
  total_executions BIGINT,
  avg_latency_ms NUMERIC,
  success_rate NUMERIC,
  total_cost_cents NUMERIC,
  phase TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    ap.agent_id,
    ap.title,
    COUNT(*) as total_executions,
    ROUND(AVG(apm.execution_time_ms), 2) as avg_latency_ms,
    ROUND(AVG(CASE WHEN apm.success THEN 100 ELSE 0 END), 2) as success_rate,
    ROUND(COALESCE(SUM(apm.cost_cents), 0), 4) as total_cost_cents,
    ap.phase
  FROM public.agent_performance_metrics apm
  JOIN public.agent_prompts ap ON ap.id = apm.agent_prompt_id
  WHERE apm.swarm_id = p_swarm_id
    AND apm.created_at >= (now() - (p_days || ' days')::interval)
  GROUP BY ap.agent_id, ap.title, ap.phase
  ORDER BY ap.phase, ap.exec_order
$$;

-- Function to get user token balance (free vs paid)
CREATE OR REPLACE FUNCTION public.get_user_token_balance(p_user_id UUID)
RETURNS TABLE (
  free_tokens_remaining INT,
  paid_tokens_remaining INT,
  total_tokens_used INT,
  total_cost_cents NUMERIC
) LANGUAGE SQL STABLE AS $$
  WITH token_summary AS (
    SELECT
      COALESCE(SUM(CASE WHEN tokens_source = 'free' THEN tokens_used ELSE 0 END), 0)::INT as free_used,
      COALESCE(SUM(CASE WHEN tokens_source = 'paid' THEN tokens_used ELSE 0 END), 0)::INT as paid_used,
      COALESCE(SUM(cost_cents), 0) as total_cost
    FROM public.agent_token_usage
    WHERE user_id = p_user_id
  ),
  user_limits AS (
    SELECT
      COALESCE((SELECT value FROM public.user_preferences WHERE user_id = p_user_id AND key = 'free_token_limit'), '100000')::INT as free_limit,
      COALESCE((SELECT value FROM public.user_preferences WHERE user_id = p_user_id AND key = 'paid_token_limit'), '0')::INT as paid_limit
  )
  SELECT
    (ul.free_limit - ts.free_used)::INT as free_tokens_remaining,
    (ul.paid_limit - ts.paid_used)::INT as paid_tokens_remaining,
    (ts.free_used + ts.paid_used)::INT as total_tokens_used,
    ROUND(ts.total_cost, 4) as total_cost_cents
  FROM token_summary ts, user_limits ul
$$;

-- ============================================================================
-- PART 5: Seed Pat's Voice Agent Configuration
-- ============================================================================

DO $$
DECLARE
  v_system_user UUID;
  v_voice_agent_id UUID;
BEGIN
  -- Get system user
  SELECT id INTO v_system_user FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_system_user IS NULL THEN
    v_system_user := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Insert Pat's Voice Agent for personality swarm
  INSERT INTO public.agent_prompts (
    agent_id,
    title,
    content,
    model,
    phase,
    exec_order,
    status,
    version,
    created_by,
    agent_type,
    temperature,
    max_tokens,
    voice_config
  ) VALUES (
    'pat-voice-personality',
    'Pat Voice Personality Agent',
    'You are Pat, the friendly and encouraging fitness coach. Respond with warmth, enthusiasm, and personalized guidance. Keep responses conversational and natural for voice interaction. Focus on motivating users while providing accurate fitness and nutrition information.',
    'gpt-4o-realtime-preview',
    'presenter',
    100,
    'draft',
    1,
    v_system_user,
    'voice',
    0.8,
    500,
    jsonb_build_object(
      'provider', 'openai',
      'voice', 'alloy',
      'speed', 1.0,
      'instructions', 'Speak in a friendly, encouraging tone. Use natural pauses and emphasis to convey warmth and enthusiasm.',
      'modalities', jsonb_build_array('text', 'audio'),
      'turn_detection', jsonb_build_object(
        'type', 'server_vad',
        'threshold', 0.5,
        'prefix_padding_ms', 300,
        'silence_duration_ms', 200
      )
    )
  )
  ON CONFLICT (agent_id, version) DO NOTHING
  RETURNING id INTO v_voice_agent_id;

  -- Add note about voice agent
  IF v_voice_agent_id IS NOT NULL THEN
    RAISE NOTICE 'Created Pat Voice Agent with ID: %', v_voice_agent_id;
  END IF;
END $$;

-- ============================================================================
-- PART 6: Seed Common Agent Templates
-- ============================================================================

DO $$
DECLARE
  v_system_user UUID;
BEGIN
  SELECT id INTO v_system_user FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_system_user IS NULL THEN
    v_system_user := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;

  -- Intent Classification Template
  INSERT INTO public.agent_config_templates (name, description, category, template_config, is_public, created_by)
  VALUES (
    'Intent Classifier',
    'Classifies user intent from natural language input',
    'routing',
    jsonb_build_object(
      'phase', 'pre',
      'order', 0,
      'model', 'gpt-4o-mini',
      'temperature', 0.3,
      'max_tokens', 200,
      'response_format', 'json',
      'prompt_template', 'Classify the user intent from the following message. Return JSON with intent (string) and confidence (0-1).'
    ),
    true,
    v_system_user
  ) ON CONFLICT DO NOTHING;

  -- Data Normalizer Template
  INSERT INTO public.agent_config_templates (name, description, category, template_config, is_public, created_by)
  VALUES (
    'Data Normalizer',
    'Normalizes and standardizes user input',
    'processing',
    jsonb_build_object(
      'phase', 'pre',
      'order', 5,
      'model', 'gpt-4o-mini',
      'temperature', 0.1,
      'max_tokens', 500,
      'response_format', 'json',
      'prompt_template', 'Normalize the following user input. Fix typos, expand abbreviations, standardize units.'
    ),
    true,
    v_system_user
  ) ON CONFLICT DO NOTHING;

  -- Output Formatter Template
  INSERT INTO public.agent_config_templates (name, description, category, template_config, is_public, created_by)
  VALUES (
    'Output Formatter',
    'Formats response for user-friendly display',
    'presentation',
    jsonb_build_object(
      'phase', 'presenter',
      'order', 90,
      'model', 'template',
      'temperature', 0.0,
      'max_tokens', 1000,
      'response_format', 'text',
      'prompt_template', 'Format the following data in a clear, user-friendly way.'
    ),
    true,
    v_system_user
  ) ON CONFLICT DO NOTHING;

END $$;

-- ============================================================================
-- PART 7: Update Triggers
-- ============================================================================

-- Touch updated_at for new tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tg_touch_agent_config_templates') THEN
    CREATE TRIGGER tg_touch_agent_config_templates
      BEFORE UPDATE ON public.agent_config_templates
      FOR EACH ROW EXECUTE PROCEDURE public.tg_touch_updated_at();
  END IF;
END $$;

-- ============================================================================
-- PART 8: Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.agent_config_templates IS 'Reusable agent configuration templates for common patterns';
COMMENT ON TABLE public.agent_performance_metrics IS 'Tracks performance metrics for each agent execution';
COMMENT ON TABLE public.agent_token_usage IS 'Tracks token usage per agent, distinguishing free vs paid tokens';
COMMENT ON TABLE public.swarm_testing_sessions IS 'Manages safe testing of swarm configurations before rollout';
COMMENT ON TABLE public.agent_dependencies IS 'Tracks dependencies between agents for execution ordering';

COMMENT ON COLUMN public.agent_prompts.temperature IS 'LLM temperature setting (0-2), controls randomness';
COMMENT ON COLUMN public.agent_prompts.max_tokens IS 'Maximum tokens for LLM response';
COMMENT ON COLUMN public.agent_prompts.agent_type IS 'Type of agent: llm, rule, code, template, or voice';
COMMENT ON COLUMN public.agent_prompts.voice_config IS 'Configuration for voice agents (OpenAI/ElevenLabs)';
COMMENT ON COLUMN public.agent_prompts.is_optional IS 'Whether agent can be skipped if it fails';
COMMENT ON COLUMN public.agent_prompts.fallback_behavior IS 'What to do if agent fails: error, skip, or use default';

-- Final notice
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Agent Configuration System Created';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All changes are admin-only and backward compatible';
  RAISE NOTICE 'Default rollout_percent=0 ensures no user impact';
  RAISE NOTICE 'Pat Voice Agent created in draft status';
  RAISE NOTICE 'Ready for admin configuration via UI';
END $$;
