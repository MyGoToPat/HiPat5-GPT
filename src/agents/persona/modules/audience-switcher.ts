import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const audienceSwitcher: PersonaAgent = {
  id: "audience-switcher",
  title: "Audience Switcher",
  order: 11,
  enabled: true,
  params: { channel: "dm" }, // dm | post | email
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    return draft; // placeholder. channel-specific transforms later.
  },
};