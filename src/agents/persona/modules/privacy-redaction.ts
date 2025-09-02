import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const privacyRedaction: PersonaAgent = {
  id: "privacy-redaction",
  title: "Privacy & Redaction",
  order: 4,
  enabled: true,
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    const redacted = draft.text.replace(/(sk-[a-z0-9-_]+)/ig, "[redacted]");
    return { ...draft, text: redacted };
  },
};