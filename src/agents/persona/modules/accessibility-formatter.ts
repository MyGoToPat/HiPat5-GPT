import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const accessibilityFormatter: PersonaAgent = {
  id: "accessibility-formatter",
  title: "Accessibility Formatter",
  order: 10,
  enabled: true,
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    // keep lines short for readability
    const wrapped = draft.text.replace(/(.{1,90})(\s|$)/g, "$1\n").trim();
    return { ...draft, text: wrapped };
  },
};