import { describe, it, expect } from 'vitest';
import { personaOrchestrator } from '../../persona/orchestrator';
import type { PersonaContext } from '../../persona/types';

describe('Persona Orchestrator', () => {
  const baseCtx: PersonaContext = {
    userId: 'u1',
    tier: 'beta',
    passiveMode: false,
    dayTargets: { calories: 2400, protein_g: 180, fat_g: 80, carbs_g: 220 },
    dayTotals: { calories: 1200, protein_g: 90, fat_g: 35, carbs_g: 110 },
  };

  it('enforces passive-mode suppression', async () => {
    const ctx = { ...baseCtx, passiveMode: true };
    const out = await personaOrchestrator(ctx, { text: 'say hi' });
    expect(out.allowed).toBe(false);
    expect(out.text).toBe('');
  });

  it('blocks unsafe content via safety gate', async () => {
    const ctx = { ...baseCtx, passiveMode: false };
    const out = await personaOrchestrator(ctx, { text: 'stack clen + yohimbine + t3 without supervision' });
    expect(out.allowed).toBe(false);
    expect(out.safetyBlocked).toBe(true);
  });

  it('applies tone shaping and returns macro deltas', async () => {
    const ctx = { ...baseCtx, passiveMode: false };
    const out = await personaOrchestrator(ctx, { text: 'Can you explain macros really simply?' });
    expect(out.allowed).toBe(true);
    expect(out.text.length).toBeGreaterThan(0);
    expect(out.deltas?.calories?.used).toBe(1200);
    expect(out.deltas?.calories?.target).toBe(2400);
  });
});