import { enabledAgentsByTier } from './tierGating';
import { detectStyleProfile } from './styleProfiler';
import { shapeTone } from './toneShaper';
import { enforcePassiveMode } from './passiveMode';
import { safetyGate } from './safety';
import { computeDeltas } from './macroSentinel';
import type { PersonaContext, PersonaRequest, PersonaDraft, PersonaResponse } from './types';

// Deterministic minimal orchestrator per PRD flow: gating → style → tone → safety → passive → voice (omitted here).
export async function personaOrchestrator(ctx: PersonaContext, req: PersonaRequest): Promise<PersonaResponse> {
  const enabled = enabledAgentsByTier(ctx.tier);

  // Style profile
  const style = detectStyleProfile([req.text]);
  ctx.styleProfile = style;

  // Draft response (placeholder; downstream swarms will generate content)
  const draft: PersonaDraft = {
    text: `Understood. I'll help you with "${req.text}".`,
    notes: [`enabled: ${enabled.join(', ')}`],
  };

  // Tone shaping
  const toned = shapeTone(draft, style);

  // Safety
  const gate = safetyGate(toned);
  if (!gate.approved) {
    const blocked: PersonaResponse = { allowed: false, text: `I can't help with that. ${gate.rationale}`, safetyBlocked: true };
    return enforcePassiveMode(ctx, blocked);
  }

  // Macro sentinel (non-blocking nudge data)
  const deltas = computeDeltas(ctx);

  const resp: PersonaResponse = {
    allowed: true,
    text: toned.text,
    variant: 'baseline',
    deltas,
  };

  // Passive-mode suppression as final step
  return enforcePassiveMode(ctx, resp);
}