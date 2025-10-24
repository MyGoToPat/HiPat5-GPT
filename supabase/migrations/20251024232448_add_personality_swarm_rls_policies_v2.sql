/*
  # Add RLS Policies for Personality Swarm Tables
  
  1. Purpose
    - Allow anon users to read published personality agents
    - Allow anon users to read personality swarm configuration
    - Required for edge function swarm loader to work
  
  2. Security
    - agent_prompts: anon can SELECT only published agents
    - agent_configs: anon can SELECT personality config only
    - Both tables require authentication for write operations (existing policies)
*/

-- Ensure RLS is enabled on agent_prompts
ALTER TABLE agent_prompts ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on agent_configs
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "agent_prompts_read_published" ON agent_prompts;
DROP POLICY IF EXISTS "agent_configs_read_personality" ON agent_configs;

-- Add policy for anon to read published agent prompts
CREATE POLICY "agent_prompts_read_published"
  ON agent_prompts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Add policy for anon to read personality agent config
CREATE POLICY "agent_configs_read_personality"
  ON agent_configs
  FOR SELECT
  TO anon, authenticated
  USING (agent_key = 'personality');
