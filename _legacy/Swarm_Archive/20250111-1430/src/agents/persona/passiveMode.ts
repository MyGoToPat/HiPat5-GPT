import type { PersonaContext, PersonaResponse } from './types';

// Enforce "speak only when Dwayne says" during live sessions (Passive-Mode Controller).
export function enforcePassiveMode(ctx: PersonaContext, resp: PersonaResponse): PersonaResponse {
  if (ctx.passiveMode) {
    return { allowed: false, text: '', safetyBlocked: false };
  }
  return resp;
}