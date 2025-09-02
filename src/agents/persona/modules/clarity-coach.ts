import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const clarityCoach: PersonaAgent = {
  id: "clarity-coach",
  title: "Clarity Coach",
  order: 3,
  enabled: true,
  params: { minLen: 8 },
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    const needs = draft.text.trim().length < 8;
    if (needs) {
      draft.meta = { ...(draft.meta || {}), clarify: "What's the goal in one line?" };
    }
    return draft;
  },
};