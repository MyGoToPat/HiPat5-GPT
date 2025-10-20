/*
  # Create agent_configs table for editable swarm agents

  1. New Tables
    - `agent_configs`
      - `id` (bigint, primary key)
      - `agent_key` (text, not null, unique) — agent identifier
      - `config` (jsonb, not null) — agent configuration JSON
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `agent_configs` table
    - Add policy for authenticated admins to read/write configs
    - No public access

  3. Notes
    - Supports Admin → Swarm Management → Edit Configuration
    - Idempotent: safe to run multiple times
*/

-- Create agent configs table
CREATE TABLE IF NOT EXISTS agent_configs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_key TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups by agent_key
CREATE INDEX IF NOT EXISTS agent_configs_agent_key_idx
  ON agent_configs(agent_key);

-- Index for updated_at queries
CREATE INDEX IF NOT EXISTS agent_configs_updated_at_idx
  ON agent_configs(updated_at DESC);

-- Enable RLS
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all agent configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'agent_configs'
    AND policyname = 'Admins can read agent configs'
  ) THEN
    CREATE POLICY "Admins can read agent configs"
      ON agent_configs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END$$;

-- Policy: Admins can insert agent configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'agent_configs'
    AND policyname = 'Admins can insert agent configs'
  ) THEN
    CREATE POLICY "Admins can insert agent configs"
      ON agent_configs FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END$$;

-- Policy: Admins can update agent configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'agent_configs'
    AND policyname = 'Admins can update agent configs'
  ) THEN
    CREATE POLICY "Admins can update agent configs"
      ON agent_configs FOR UPDATE
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
END$$;

-- Comment for documentation
COMMENT ON TABLE agent_configs IS 'Editable configuration for swarm agents (Admin → Swarm Management)';
COMMENT ON COLUMN agent_configs.agent_key IS 'Unique identifier for the agent (e.g., "macro_sentinel")';
COMMENT ON COLUMN agent_configs.config IS 'Full agent configuration including prompts, model, temperature, etc.';