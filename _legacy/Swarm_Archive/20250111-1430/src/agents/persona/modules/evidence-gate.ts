import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const evidenceGate: PersonaAgent = {
  id: "evidence-gate",
  title: "Evidence Gate",
  order: 5,
  enabled: true,
  params: { riskTerms: ["medical", "legal", "dosage", "diagnosis"] },
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    const highRisk = /medical|legal|dosage|diagnosis/i.test(draft.text);
    draft.meta = { ...(draft.meta || {}), needsCitations: highRisk };
    return draft;
  },
};