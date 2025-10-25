/*
  # Fix Personality Swarm Configuration

  1. Problem
    - agent_configs row for 'personality' contains stale/incorrect agent array
    - Admin UI shows "Master Personality (V3)" or incorrect agents

  2. Solution
    - Update ONLY config->'agents' array using jsonb_set
    - Keep all other config keys intact (swarm_name, etc.)
    - Use 10 agents with correct IDs, phases (PRE/POST only), and orders

  3. Changes
    - Replaces config->'agents' with correct 10-agent array
    - Each agent: {id, enabled, phase, order}
    - No name or promptRef in config (UI resolves from agent_prompts)

  4. Verification
    SELECT agent_key, jsonb_array_length(config->'agents') AS count
    FROM agent_configs
    WHERE agent_key='personality';
    Expected: count = 10
*/

-- Update ONLY the agents array. Keep all other config keys intact.
UPDATE agent_configs
SET config = jsonb_set(
  COALESCE(config, '{}'::jsonb),
  '{agents}',
  '[
    {"id":"PERSONALITY_VOICE","enabled":true,"phase":"PRE","order":10},
    {"id":"PERSONALITY_AUDIENCE","enabled":true,"phase":"PRE","order":20},
    {"id":"PERSONALITY_AMBIGUITY","enabled":true,"phase":"PRE","order":30},
    {"id":"PERSONALITY_CORE_RESPONDER","enabled":true,"phase":"POST","order":40},
    {"id":"PERSONALITY_STRUCTURE","enabled":true,"phase":"POST","order":50},
    {"id":"PERSONALITY_NUMBERS","enabled":true,"phase":"POST","order":60},
    {"id":"PERSONALITY_SAFETY","enabled":true,"phase":"POST","order":70},
    {"id":"PERSONALITY_MEMORY","enabled":true,"phase":"POST","order":80},
    {"id":"PERSONALITY_RECOVERY","enabled":true,"phase":"POST","order":90},
    {"id":"PERSONALITY_TOOL_GOV","enabled":true,"phase":"POST","order":95}
  ]'::jsonb,
  true
)
WHERE agent_key='personality';
