/*
# Profile Learning Table and Personality Agents Seed

1. New Tables
  - `profile_learning`
    - `user_id` (uuid, primary key)
    - `v` (numeric, visual learning weight)
    - `a` (numeric, auditory learning weight) 
    - `r` (numeric, reading learning weight)
    - `k` (numeric, kinesthetic learning weight)
    - `confidence` (numeric, confidence score)
    - `updated_at` (timestamp)

2. Security
  - Enable RLS on `profile_learning` table
  - Add policy for users to access own learning data

3. Data Seeds
  - Insert 12 personality agents into agents table
  - Create initial versions for each personality agent
*/

-- profile_learning table
create table if not exists public.profile_learning (
  user_id uuid primary key references auth.users(id) on delete cascade,
  v numeric not null default 0.25,
  a numeric not null default 0.25,
  r numeric not null default 0.25,
  k numeric not null default 0.25,
  confidence numeric not null default 0.2,
  updated_at timestamptz not null default now()
);

alter table public.profile_learning enable row level security;

create policy "own_profile_learning" on public.profile_learning
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- personality agents seed
insert into public.agents (id, name, description, category, active, created_by, org_id)
values
  ('empathy-detector','Empathy Detector','Reads user mood and stress from turns and latency','personality',true,(select auth.uid()),null),
  ('learning-profiler','Learning Profiler','Profiles user learning preferences (visual/auditory/reading/kinesthetic)','personality',true,(select auth.uid()),null),
  ('clarity-coach','Clarity Coach','Adds clarifying questions when needed based on intent','personality',true,(select auth.uid()),null),
  ('privacy-redaction','Privacy & Redaction','Redacts sensitive data from candidate memory fields','personality',true,(select auth.uid()),null),
  ('evidence-gate','Evidence Gate','Decides when to add citations based on claim types','personality',true,(select auth.uid()),null),
  ('conciseness-enforcer','Conciseness Enforcer','Ensures replies are short based on token budget','personality',true,(select auth.uid()),null),
  ('uncertainty-calibrator','Uncertainty Calibrator','Calibrates confidence language based on model scores','personality',true,(select auth.uid()),null),
  ('persona-consistency','Persona Consistency Checker','Enforces tone and first-person rules','personality',true,(select auth.uid()),null),
  ('time-context','Time & Context Inserter','Adds exact dates and times based on context','personality',true,(select auth.uid()),null),
  ('accessibility-formatter','Accessibility Formatter','Improves readability based on user accessibility flags','personality',true,(select auth.uid()),null),
  ('audience-switcher','Audience Switcher','Switches voice for different communication channels','personality',true,(select auth.uid()),null),
  ('actionizer','Actionizer','Adds one small action step to final content','personality',true,(select auth.uid()),null)
on conflict (id) do nothing;

-- personality versions seed (minimal config with proper order)
insert into public.agent_versions (agent_id, version, config, created_by, org_id)
values
  ('empathy-detector', 1, '{"order": 1, "params": {}, "inputs": ["last 3 user turns", "latency"], "outputs": ["mood", "confidence"]}', (select auth.uid()), null),
  ('learning-profiler', 1, '{"order": 2, "params": {"alpha": 0.2}, "inputs": ["user utterances"], "outputs": ["learning weights"]}', (select auth.uid()), null),
  ('clarity-coach', 1, '{"order": 3, "params": {"minLen": 8}, "inputs": ["draft reply", "intent score"], "outputs": ["clarify prompt", "proceed"]}', (select auth.uid()), null),
  ('privacy-redaction', 1, '{"order": 4, "params": {}, "inputs": ["candidate memory fields"], "outputs": ["redactions"]}', (select auth.uid()), null),
  ('evidence-gate', 1, '{"order": 5, "params": {"riskTerms": ["medical", "legal", "dosage", "diagnosis"]}, "inputs": ["claim types"], "outputs": ["citations array", "uncertain flag"]}', (select auth.uid()), null),
  ('conciseness-enforcer', 1, '{"order": 6, "params": {"maxSentences": 8}, "inputs": ["draft reply", "token budget"], "outputs": ["compressed reply"]}', (select auth.uid()), null),
  ('uncertainty-calibrator', 1, '{"order": 7, "params": {}, "inputs": ["model logprobs", "retrieval scores"], "outputs": ["confidence phrasing"]}', (select auth.uid()), null),
  ('persona-consistency', 1, '{"order": 8, "params": {}, "inputs": ["draft reply"], "outputs": ["cleaned reply"]}', (select auth.uid()), null),
  ('time-context', 1, '{"order": 9, "params": {}, "inputs": ["now", "user timezone"], "outputs": ["date-specific phrasing"]}', (select auth.uid()), null),
  ('accessibility-formatter', 1, '{"order": 10, "params": {}, "inputs": ["user flags"], "outputs": ["accessible formatting"]}', (select auth.uid()), null),
  ('audience-switcher', 1, '{"order": 11, "params": {"channel": "dm"}, "inputs": ["channel type"], "outputs": ["reformatted content"]}', (select auth.uid()), null),
  ('actionizer', 1, '{"order": 12, "params": {"label": "Do this now"}, "inputs": ["final content"], "outputs": ["next_action"]}', (select auth.uid()), null)
on conflict (agent_id, version) do nothing;

-- set current version for each agent
update public.agents set current_version_id = (
  select id from public.agent_versions 
  where agent_versions.agent_id = agents.id 
  and version = 1
) where category = 'personality';