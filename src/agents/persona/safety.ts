import type { PersonaDraft } from './types';

// Minimal safety pass; in production this gates via medical_safety_policies RAG.
const BANNED = [
  'stack clen + yohimbine + t3 without supervision',
  'inject household substances',
];

export function safetyGate(draft: PersonaDraft): { approved: boolean; rationale?: string } {
  const lower = draft.text.toLowerCase();
  const hit = BANNED.find(p => lower.includes(p));
  if (hit) return { approved: false, rationale: `blocked: ${hit}` };
  return { approved: true };
}