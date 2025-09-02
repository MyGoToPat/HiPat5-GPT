import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const timeContext: PersonaAgent = {
  id: "time-context",
  title: "Time & Context Inserter",
  order: 9,
  enabled: true,
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    const nowISO = ctx.nowISO || new Date().toISOString();
    draft.meta = { ...(draft.meta || {}), nowISO };
    return draft;
  },
};