import type { StyleProfile, PersonaDraft } from './types';

// Enforce spartan style where appropriate; calibrate warmth/firmness per PRD.
export function shapeTone(draft: PersonaDraft, style: StyleProfile): PersonaDraft {
  let text = draft.text.trim();

  // Spartan pass: short lines, active voice bias, remove filler (very, really, just)
  text = text.replace(/\b(really|very|just)\b/gi, '').replace(/\s{2,}/g, ' ').trim();

  // If user prefers short, compress gently
  if (style.brevity === 'short') {
    // collapse multi-sentence to concise lines
    text = text.split(/(?<=[.!?])\s+/).slice(0, 3).join(' ');
  }

  // Cadence tweak: if fast, keep it tight; if slow, add gentle pacing with line breaks
  if (style.cadence === 'slow') text = text.replace(/\. /g, '.\n');

  return { ...draft, text };
}