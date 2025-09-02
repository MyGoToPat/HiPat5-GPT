/*
  # Profile Learning and Personality Agents Setup

  1. New Tables
    - `profile_learning`
      - `user_id` (uuid, primary key, foreign key to auth.users)
      - `v` (numeric, visual learning weight, default 0.25)
      - `a` (numeric, auditory learning weight, default 0.25) 
      - `r` (numeric, reading learning weight, default 0.25)
      - `k` (numeric, kinesthetic learning weight, default 0.25)
      - `confidence` (numeric, confidence level, default 0.2)
      - `updated_at` (timestamp)

  2. Data Seeding
    - Seed 12 personality agents into `agents` table
    - Create initial versions for each personality agent

  3. Security
    - Enable RLS on `profile_learning` table
    - Add policy for users to manage their own learning profile
*/

-- profile_learning table
CREATE TABLE IF NOT EXISTS public.profile_learning (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  v numeric NOT NULL DEFAULT 0.25,
  a numeric NOT NULL DEFAULT 0.25,
  r numeric NOT NULL DEFAULT 0.25,
  k numeric NOT NULL DEFAULT 0.25,
  confidence numeric NOT NULL DEFAULT 0.2,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile_learning" ON public.profile_learning
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add category column to agents table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.agents ADD COLUMN category text DEFAULT 'general';
  END IF;
END $$;

-- personality agents seed
INSERT INTO public.agents (id, name, category, active, created_by)
VALUES
  ('empathy-detector','Empathy Detector','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('learning-profiler','Learning Profiler','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('clarity-coach','Clarity Coach','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('privacy-redaction','Privacy & Redaction','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('evidence-gate','Evidence Gate','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('conciseness-enforcer','Conciseness Enforcer','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('uncertainty-calibrator','Uncertainty Calibrator','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('persona-consistency','Persona Consistency Checker','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('time-context','Time & Context Inserter','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('accessibility-formatter','Accessibility Formatter','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('audience-switcher','Audience Switcher','personality',true, '00000000-0000-0000-0000-000000000000'),
  ('actionizer','Actionizer','personality',true, '00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;

-- personality versions seed (minimal config with order)
INSERT INTO public.agent_versions (agent_id, version, config, created_by)
SELECT 
  id, 
  1, 
  jsonb_build_object(
    'order', 
    CASE 
      WHEN id = 'empathy-detector' THEN 1
      WHEN id = 'learning-profiler' THEN 2
      WHEN id = 'clarity-coach' THEN 3
      WHEN id = 'privacy-redaction' THEN 4
      WHEN id = 'evidence-gate' THEN 5
      WHEN id = 'conciseness-enforcer' THEN 6
      WHEN id = 'uncertainty-calibrator' THEN 7
      WHEN id = 'persona-consistency' THEN 8
      WHEN id = 'time-context' THEN 9
      WHEN id = 'accessibility-formatter' THEN 10
      WHEN id = 'audience-switcher' THEN 11
      WHEN id = 'actionizer' THEN 12
      ELSE 1
    END,
    'params', 
    CASE 
      WHEN id = 'learning-profiler' THEN jsonb_build_object('alpha', 0.2)
      WHEN id = 'clarity-coach' THEN jsonb_build_object('minLen', 8)
      WHEN id = 'evidence-gate' THEN jsonb_build_object('riskTerms', '["medical", "legal", "dosage", "diagnosis"]'::jsonb)
      WHEN id = 'conciseness-enforcer' THEN jsonb_build_object('maxSentences', 8)
      WHEN id = 'audience-switcher' THEN jsonb_build_object('channel', 'dm')
      WHEN id = 'actionizer' THEN jsonb_build_object('label', 'Do this now')
      ELSE jsonb_build_object()
    END,
    'enabled', true
  ),
  '00000000-0000-0000-0000-000000000000'
FROM public.agents 
WHERE category = 'personality'
ON CONFLICT (agent_id, version) DO NOTHING;

-- Update agents to point to their current version
UPDATE public.agents 
SET current_version_id = (
  SELECT id FROM public.agent_versions 
  WHERE agent_id = agents.id AND version = 1
  LIMIT 1
)
WHERE category = 'personality' AND current_version_id IS NULL;