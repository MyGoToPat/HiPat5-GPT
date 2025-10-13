/*
  # Seed Macro and TMWYA Swarm Agents v3
  
  Loads macro and TMWYA swarm agent configurations into the database.
  Uses 'prod' stage as required by check constraint.
*/

DO $$
DECLARE
  v_system_user uuid;
  v_agent_id uuid;
  v_version_id uuid;
BEGIN
  SELECT id INTO v_system_user FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_system_user IS NULL THEN
    v_system_user := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Macro Router
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Macro Router', 'macro-router', 'macro', true, 'Routes incoming text to macro processing', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"macro.router","model":"rule","phase":"pre","order":0}'::jsonb, '{"id":"macro.router","model":"rule","phase":"pre","order":0}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- Meal NLU
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Meal NLU (Shared)', 'meal-nlu-shared', 'macro', true, 'NLU for meal descriptions', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"macro.nlu","model":"gpt-4o-mini","phase":"core","order":10}'::jsonb, '{"id":"macro.nlu","model":"gpt-4o-mini","phase":"core","order":10}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- Resolver Adapter
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Resolver Adapter', 'resolver-adapter', 'macro', true, 'Adapts parsed meal for resolution', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"macro.resolverAdapter","model":"code","phase":"core","order":20}'::jsonb, '{"id":"macro.resolverAdapter","model":"code","phase":"core","order":20}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- Macro Aggregator
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Macro Aggregator', 'macro-aggregator', 'macro', true, 'Aggregates macro nutrients', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"macro.aggregator","model":"code","phase":"core","order":30}'::jsonb, '{"id":"macro.aggregator","model":"code","phase":"core","order":30}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- Macro Formatter
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Deterministic Macro Formatter', 'macro-formatter-det', 'macro', true, 'Formats macro output', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"macro.formatter.det","model":"template","phase":"post","order":40}'::jsonb, '{"id":"macro.formatter.det","model":"template","phase":"post","order":40}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- Macro Logger
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Macro Logger', 'macro-logger', 'macro', true, 'Logs macro data to database', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"macro.logger","model":"code","phase":"core","order":50}'::jsonb, '{"id":"macro.logger","model":"code","phase":"core","order":50}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- TMWYA Intent
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('TMWYA Intent Classifier', 'tmwya-intent', 'tmwya', true, 'Classifies user intent', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"tmwya.intent","model":"rule","phase":"pre","order":0}'::jsonb, '{"id":"tmwya.intent","model":"rule","phase":"pre","order":0}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- TMWYA Normalizer
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Utterance Normalizer', 'tmwya-normalizer', 'tmwya', true, 'Normalizes user input', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"tmwya.normalizer","model":"gpt-4o-mini","phase":"pre","order":5}'::jsonb, '{"id":"tmwya.normalizer","model":"gpt-4o-mini","phase":"pre","order":5}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- Portion Resolver
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Portion Resolver (Shared)', 'portion-resolver-shared', 'tmwya', true, 'Resolves portion sizes', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"shared.portionResolver","model":"code","phase":"core","order":15}'::jsonb, '{"id":"shared.portionResolver","model":"code","phase":"core","order":15}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- Nutrition Resolver
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Nutrition Resolver (Shared)', 'nutrition-resolver-shared', 'tmwya', true, 'Resolves nutrition data', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"shared.nutritionResolver","model":"code","phase":"core","order":20}'::jsonb, '{"id":"shared.nutritionResolver","model":"code","phase":"core","order":20}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- TEF Engine
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('TEF Engine', 'tmwya-tef', 'tmwya', true, 'Calculates Thermic Effect of Food', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"tmwya.tef","model":"calc","phase":"core","order":30}'::jsonb, '{"id":"tmwya.tef","model":"calc","phase":"core","order":30}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- TDEE Engine
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('TDEE Engine', 'tmwya-tdee', 'tmwya', true, 'Calculates TDEE context', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"tmwya.tdee","model":"calc","phase":"core","order":35}'::jsonb, '{"id":"tmwya.tdee","model":"calc","phase":"core","order":35}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- Verification View Builder
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('Verification View Builder', 'tmwya-verify-view', 'tmwya', true, 'Builds verification screen', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"tmwya.verifyView","model":"template","phase":"post","order":40}'::jsonb, '{"id":"tmwya.verifyView","model":"template","phase":"post","order":40}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

  -- TMWYA Logger
  INSERT INTO agents (name, slug, category, active, description, created_by)
  VALUES ('TMWYA Logger', 'tmwya-logger', 'tmwya', true, 'Logs meal after verification', v_system_user)
  ON CONFLICT (slug) DO UPDATE SET active = true RETURNING id INTO v_agent_id;
  
  INSERT INTO agent_versions (agent_id, version, config, config_json, stage, rollout_percent, created_by)
  VALUES (v_agent_id, 1, '{"id":"tmwya.logger","model":"code","phase":"core","order":50}'::jsonb, '{"id":"tmwya.logger","model":"code","phase":"core","order":50}'::jsonb, 'prod', 100, v_system_user)
  ON CONFLICT DO NOTHING RETURNING id INTO v_version_id;
  UPDATE agents SET current_version_id = v_version_id WHERE id = v_agent_id AND v_version_id IS NOT NULL;

END $$;
