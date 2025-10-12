import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const concisenessEnforcer: PersonaAgent = {
  id: "conciseness-enforcer",
  title: "Conciseness Enforcer",
  order: 6,
  enabled: true,
  params: { maxSentences: 8 },
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    const sentences = draft.text.split(/(?<=[.!?])\s+/);
    const limited = sentences.slice(0, 8).join(" ");
    return { ...draft, text: limited };
  },
};