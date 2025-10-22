/*
  # Update Personality Agents to V3 (12 → 5 Agents)

  ## Summary
  Updates the `agents` table (category='personality') to reflect the optimized V3 architecture.
  
  ## Current State (12 agents)
  1. Empathy Detector → Master Personality (V3)
  2. Learning Profiler → Empathy Detector (repurposed)
  3. Privacy & Redaction → Protected Blocks Sentinel (repurposed)
  4. Evidence Gate → DISABLED
  5. Clarity Coach → Clarity Enforcer (renamed)
  6. Conciseness Enforcer → DISABLED
  7. Uncertainty Calibrator → DISABLED
  8. Persona Consistency Checker → DISABLED
  9. Time & Context Inserter → DISABLED
  10. Accessibility Formatter → DISABLED
  11. Audience Switcher → Audience Detector (renamed)
  12. Actionizer → DISABLED

  ## Target State (5 active agents)
  1. Master Personality (V3) - order 0
  2. Empathy Detector - order 5
  3. Audience Detector - order 6
  4. Clarity Enforcer - order 20
  5. Protected Blocks Sentinel - order 90
*/

-- Step 1: Disable agents that are now built into Master Personality
UPDATE agents
SET enabled = false
WHERE category = 'personality'
  AND slug IN (
    'evidence-gate',
    'conciseness-enforcer',
    'uncertainty-calibrator',
    'persona-consistency',
    'time-context',
    'accessibility-formatter',
    'actionizer'
  );

-- Step 2: Convert Empathy Detector → Master Personality (V3)
UPDATE agents
SET 
  name = 'Master Personality (V3)',
  slug = 'persona-master',
  "order" = 0,
  description = 'Pat''s core identity and communication style. Domain-agnostic, human-like, JARVIS-esque.'
WHERE category = 'personality' AND slug = 'empathy-detector';

-- Step 3: Repurpose Learning Profiler → Empathy Detector
UPDATE agents
SET 
  name = 'Empathy Detector',
  slug = 'persona-empathy',
  "order" = 5,
  enabled = true,
  description = 'Detects emotional state and provides style hints (pace, directness, encouragement). JSON output only.'
WHERE category = 'personality' AND slug = 'learning-profiler';

-- Step 4: Update Audience Switcher → Audience Detector
UPDATE agents
SET 
  name = 'Audience Detector',
  slug = 'persona-audience',
  "order" = 6,
  description = 'Detects expertise level and format preferences (verbosity, jargon policy, math detail). JSON output only.'
WHERE category = 'personality' AND slug = 'audience-switcher';

-- Step 5: Update Clarity Coach → Clarity Enforcer
UPDATE agents
SET 
  name = 'Clarity Enforcer',
  slug = 'persona-clarity',
  "order" = 20,
  description = 'Polishes for clarity: breaks long sentences, defines jargon, preserves protected blocks.'
WHERE category = 'personality' AND slug = 'clarity-coach';

-- Step 6: Repurpose Privacy & Redaction → Protected Blocks Sentinel
UPDATE agents
SET 
  name = 'Protected Blocks Sentinel',
  slug = 'persona-protected-sentinel',
  "order" = 90,
  enabled = true,
  description = 'Validates that protected blocks [[PROTECT_*]] remain unchanged. Domain-agnostic safety check.'
WHERE category = 'personality' AND slug = 'privacy-redaction';

-- Step 7: Verify final state (fixed GROUP BY issue)
DO $$
DECLARE
  enabled_count int;
  disabled_count int;
BEGIN
  SELECT COUNT(*) INTO enabled_count 
  FROM agents 
  WHERE category = 'personality' AND enabled = true;
  
  SELECT COUNT(*) INTO disabled_count 
  FROM agents 
  WHERE category = 'personality' AND enabled = false;
  
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Personality Swarm V3 Migration Complete';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Enabled agents: %', enabled_count;
  RAISE NOTICE 'Disabled agents: %', disabled_count;
  RAISE NOTICE 'Total agents: %', enabled_count + disabled_count;
  RAISE NOTICE '';
  
  IF enabled_count = 5 THEN
    RAISE NOTICE '✓ SUCCESS: 5 enabled agents (expected)';
  ELSE
    RAISE WARNING '✗ MISMATCH: Expected 5 enabled agents, found %', enabled_count;
  END IF;
  
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
END $$;
