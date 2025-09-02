import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const empathyDetector: PersonaAgent = {
  id: "empathy-detector",
  title: "Empathy Detector",
  order: 1,
  enabled: true,
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    // Minimal heuristic. You can swap to ML later.
    const t = draft.text.toLowerCase();
    const stressed = /frustrated|upset|worried|urgent|devastated|anxious/.test(t);
    draft.meta = { ...(draft.meta || {}), mood: stressed ? "stressed" : "calm" };
    return draft;
  },
};