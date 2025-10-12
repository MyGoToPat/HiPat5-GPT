import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

const banned = /—|;|\\*/g; // em-dash, semicolon, asterisk

export const personaConsistency: PersonaAgent = {
  id: "persona-consistency",
  title: "Persona Consistency Checker",
  order: 8,
  enabled: true,
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    const cleaned = draft.text.replace(banned, "");
    return { ...draft, text: cleaned };
  },
};