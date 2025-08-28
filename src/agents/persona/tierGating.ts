import type { Tier } from './types';

// Minimal toggles; aligns with PRD's tier/gating summary.
export function enabledAgentsByTier(tier: Tier) {
  const base = ['style-profiler', 'tone-shaper', 'context-memory', 'safety', 'tier-gating', 'passive-mode', 'voice-basic'];
  if (tier === 'freemium') return base;
  if (tier === 'beta') return [...base, 'macro-sentinel', 'experimentation'];
  if (tier === 'paid' || tier === 'enterprise') return [...base, 'macro-sentinel', 'experimentation', 'prompt-library', 'expertise-dialer'];
  return base;
}