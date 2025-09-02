import { PersonaContext, PersonaDraft } from "./types";
import { personalitySwarm } from "./swarm";

export async function runPersonalitySwarm(ctx: PersonaContext, input: PersonaDraft): Promise<PersonaDraft> {
  let draft = { ...input };
  for (const agent of personalitySwarm.sort((a,b) => a.order - b.order)) {
    if (!agent.enabled) continue;
    draft = await agent.run(ctx, draft);
  }
  return draft;
}