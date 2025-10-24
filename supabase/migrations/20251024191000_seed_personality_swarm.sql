/*
  # Personality Swarm System - Complete Agent Configuration

  1. Agent Prompts
    - PERSONALITY_VOICE - Voice calibration (pre-phase)
    - PERSONALITY_AUDIENCE - Expertise detection (pre-phase)
    - PERSONALITY_AMBIGUITY - Clarifier logic (pre-phase)
    - PERSONALITY_CORE_RESPONDER - Main response writer (main-phase)
    - PERSONALITY_STRUCTURE - Paragraph vs bullets (post-phase)
    - PERSONALITY_NUMBERS - Echo critical numbers (post-phase)
    - PERSONALITY_SAFETY - Unsafe request refusal (post-phase)
    - PERSONALITY_MEMORY - Apply user preferences (post-phase)
    - PERSONALITY_RECOVERY - Error handling (post-phase)
    - PERSONALITY_TOOL_GOV - Tool outcome governance (post-phase)

  2. Swarm Configuration
    - Agent key: 'personality'
    - 10 agents across pre/main/post phases
    - Replaces legacy DB master + AMA directives path

  3. Purpose
    - Eliminates robotic bullet-heavy responses
    - Provides conversational, paragraph-first output
    - Maintains personality consistency across all general chat
*/

-- Insert agent prompts (idempotent)
INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_VOICE', 'published', 1, $$You are calibrating voice. Output JSON ONLY:
{
  "tone": "calm|friendly|direct",
  "formality": "low|medium|high",
  "jargon": "low|match_user",
  "greet_by_name_once": true
}
Rules: mirror user vocabulary; short sentences; natural pacing; minimal fillers.$$)
ON CONFLICT (agent_id, version) DO NOTHING;

INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_AUDIENCE', 'published', 1, $$Detect audience/prefs. Output JSON ONLY:
{
  "expertise":"novice|intermediate|advanced",
  "length":"brief|standard",
  "units":"imperial|metric",
  "style_notes": "any quick cues (optional)"
}
Prefer plain language unless user asks. Avoid jargon unless match_user.$$)
ON CONFLICT (agent_id, version) DO NOTHING;

INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_AMBIGUITY', 'published', 1, $$Decide if a clarifier is required. Output JSON ONLY:
{
  "need_clarifier": true|false,
  "clarifier": "ONE question if needed",
  "assumption": "ONE explicit assumption if no clarifier"
}
Ask only if a wrong answer risk is high; otherwise proceed with a labeled assumption.$$)
ON CONFLICT (agent_id, version) DO NOTHING;

INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_CORE_RESPONDER', 'published', 1, $$You write the answer for general chat.
- Summary first in 1–2 short paragraphs.
- Then exactly one optional next step.
- Ask one clarifier ONLY if truly blocking (max one line).
- Plain language; minimal jargon (unless user uses it).
- Echo critical numbers once if uncertainty > 15%.
- Avoid lists unless clarity requires ≤5 bullets or user asked.
- Never pretend to have tools you don't.
- If user emotion present: acknowledge in one short line, then action.

Templates you may use (only if helpful):
- Summary → Details → Next Step
- Goal → Steps → Checks
- Options → Pros/Cons → Pick based on X$$)
ON CONFLICT (agent_id, version) DO NOTHING;

INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_STRUCTURE', 'published', 1, $$Post-edit the draft (no new facts).
- Prefer paragraphs over headers/lists unless list improves clarity (≤5 bullets).
- Keep it brief and natural; remove boilerplate.
- Mirror user's formality and pacing.
Output the final revised message as plain text.$$)
ON CONFLICT (agent_id, version) DO NOTHING;

INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_NUMBERS', 'published', 1, $$If the message includes critical numbers, read them back once for confirmation when uncertainty is high. Otherwise do nothing.
Return the unchanged message if no edits needed.$$)
ON CONFLICT (agent_id, version) DO NOTHING;

INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_SAFETY', 'published', 1, $$If unsafe/high-risk:
- Refuse in one short line.
- Provide a safe alternative.
Else: return message unchanged.$$)
ON CONFLICT (agent_id, version) DO NOTHING;

INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_MEMORY', 'published', 1, $$Apply known preferences (tone, units, length). Do not announce memory usage.
Return message unchanged if no prefs.$$)
ON CONFLICT (agent_id, version) DO NOTHING;

INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_RECOVERY', 'published', 1, $$If upstream signaled an error:
- Own it briefly.
- Restate the goal.
- Provide the corrected path.
Else: no change.$$)
ON CONFLICT (agent_id, version) DO NOTHING;

INSERT INTO agent_prompts (agent_id, status, version, content) VALUES
('PERSONALITY_TOOL_GOV', 'published', 1, $$Govern tool outcomes (no new facts):
- If a tool returns {kind, logged, ...}, trust it; do not recategorize.
- "I ate ..." should route to food_log; confirm success in one line.
- "log that" should use cached macros metadata if present; avoid re-asking.
Return message unchanged unless a governance fix is needed.$$)
ON CONFLICT (agent_id, version) DO NOTHING;

-- Insert swarm configuration
INSERT INTO agent_configs (agent_key, config)
VALUES ('personality', jsonb_build_object(
  'swarm_key', 'personality',
  'agents', jsonb_build_array(
    jsonb_build_object('name','Voice Calibrator','promptRef','PERSONALITY_VOICE','phase','pre','order',10,'enabled',true),
    jsonb_build_object('name','Audience Personalizer','promptRef','PERSONALITY_AUDIENCE','phase','pre','order',20,'enabled',true),
    jsonb_build_object('name','Ambiguity & Assumptions','promptRef','PERSONALITY_AMBIGUITY','phase','pre','order',30,'enabled',true),

    jsonb_build_object('name','Core Responder','promptRef','PERSONALITY_CORE_RESPONDER','phase','main','order',40,'enabled',true),

    jsonb_build_object('name','Structure & Brevity','promptRef','PERSONALITY_STRUCTURE','phase','post','order',50,'enabled',true),
    jsonb_build_object('name','Numbers & Accuracy','promptRef','PERSONALITY_NUMBERS','phase','post','order',60,'enabled',true),
    jsonb_build_object('name','Safety & Refusal','promptRef','PERSONALITY_SAFETY','phase','post','order',70,'enabled',true),
    jsonb_build_object('name','Memory & Preferences','promptRef','PERSONALITY_MEMORY','phase','post','order',80,'enabled',true),
    jsonb_build_object('name','Error Recovery','promptRef','PERSONALITY_RECOVERY','phase','post','order',90,'enabled',true),
    jsonb_build_object('name','Tool Governance','promptRef','PERSONALITY_TOOL_GOV','phase','post','order',95,'enabled',true)
  )
))
ON CONFLICT (agent_key) DO UPDATE
SET config = EXCLUDED.config;
