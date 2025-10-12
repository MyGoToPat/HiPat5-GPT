import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const actionizer: PersonaAgent = {
  id: "actionizer",
  title: "Actionizer",
  order: 12,
  enabled: true,
  params: { label: "Do this now" },
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    draft.meta = { ...(draft.meta || {}), next_action: "Reply with your goal in one line." };
    return draft;
  },
};