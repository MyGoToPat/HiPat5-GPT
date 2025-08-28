import type { StyleProfile } from './types';

// Heuristic style profiler (converges within a few turns per PRD acceptance tests).
export function detectStyleProfile(utterances: string[]): StyleProfile {
  const text = utterances.join(' ').toLowerCase();
  const tokens = text.split(/\s+/);

  // crude cadence: tokens per 10 words chunk
  const cadence = tokens.length > 80 ? 'fast' : tokens.length > 30 ? 'normal' : 'slow';
  // brevity: single-turn heuristic
  const brevity: StyleProfile['brevity'] = tokens.length < 30 ? 'short' : tokens.length < 120 ? 'medium' : 'long';

  // mode mix: look for verbs indicating modality
  const auditory = (text.match(/\b(listen|hear|sound|tell)\b/g) || []).length;
  const visual = (text.match(/\bsee|show|look|visual\b/g) || []).length;
  const kinesthetic = (text.match(/\btry|do|practice|feel\b/g) || []).length;
  const sum = Math.max(1, auditory + visual + kinesthetic);

  return {
    modeMix: {
      auditory: auditory / sum,
      visual: visual / sum,
      kinesthetic: kinesthetic / sum,
    },
    brevity,
    cadence,
  };
}