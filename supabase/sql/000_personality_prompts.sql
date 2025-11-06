-- =============================================================================
-- PERSONALITY PROMPTS TABLE
-- Storage for Pat's voice-first personality system
-- 
-- Purpose:
--   - Store 11 personality agents that govern Pat's voice, tone, depth, and flow
--   - Separate from routing/orchestration (which lives in code)
--   - Editable via Admin UI
--
-- Schema:
--   - agent: 'pat' (future-proof for multi-agent systems)
--   - prompt_key: unique identifier (e.g., 'PERSONALITY_IDENTITY')
--   - phase: 'pre' | 'core' | 'post' (execution order)
--   - order: integer sort within phase
--   - enabled: boolean flag for toggling agents
--   - content: the actual prompt text
--
-- RLS:
--   - Authenticated users can read (SELECT)
--   - Service role can write (for Admin API)
-- =============================================================================

-- Create table
CREATE TABLE IF NOT EXISTS public.personality_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent text NOT NULL,                         -- 'pat'
  prompt_key text NOT NULL,                    -- e.g., 'PERSONALITY_IDENTITY'
  phase text NOT NULL CHECK (phase IN ('pre', 'core', 'post')),
  "order" int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent, prompt_key)
);

-- Add helpful comment
COMMENT ON TABLE public.personality_prompts IS 'Voice-first personality prompts for Pat. Separate from routing logic.';

-- Enable RLS
ALTER TABLE public.personality_prompts ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read
CREATE POLICY "read_personality_prompts"
  ON public.personality_prompts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role has full access (for Admin API)
CREATE POLICY "service_role_all_personality_prompts"
  ON public.personality_prompts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_personality_prompts_agent_phase_order
  ON public.personality_prompts(agent, phase, "order")
  WHERE enabled = true;

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_personality_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER personality_prompts_updated_at
  BEFORE UPDATE ON public.personality_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_personality_prompts_updated_at();

