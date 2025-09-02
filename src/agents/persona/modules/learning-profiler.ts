import { PersonaAgent, PersonaContext, PersonaDraft, LearningWeights } from "../types";

function bump(weights: LearningWeights, key: keyof LearningWeights, amount: number) {
  // ignore confidence in normalization
  const w = { ...weights };
  // @ts-expect-error
  w[key] = Math.min(1, Math.max(0, (w[key] as number) + amount));
  const total = (w.v + w.a + w.r + w.k);
  if (total > 0) { w.v /= total; w.a /= total; w.r /= total; w.k /= total; }
  return w;
}

export const learningProfiler: PersonaAgent = {
  id: "learning-profiler",
  title: "Learning Profiler",
  order: 2,
  enabled: true,
  params: { alpha: 0.2 },
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    const base: LearningWeights = ctx.learning || { v: 0.25, a: 0.25, r: 0.25, k: 0.25, confidence: 0.2 };
    const t = draft.text.toLowerCase();
    let w = { ...base };
    if (/show|diagram|flow|screenshot|image/.test(t)) w = bump(w, "v", 0.1);
    if (/say|tell|walk me through|sounds/.test(t)) w = bump(w, "a", 0.1);
    if (/steps|exact|quote|table|code/.test(t)) w = bump(w, "r", 0.1);
    if (/try|practice|demo|hands-on|rep/.test(t)) w = bump(w, "k", 0.1);
    draft.meta = { ...(draft.meta || {}), learning: w };
    return draft;
  },
};