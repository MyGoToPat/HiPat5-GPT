// default export: run(draft) -> draft
// Tracks learning cues: Visual (v), Auditory (a), Read/Write (r), Kinesthetic (k)
type Weights = { v: number; a: number; r: number; k: number; confidence: number };

function normalize(w: Weights): Weights {
  const s = w.v + w.a + w.r + w.k || 1;
  return { v: w.v / s, a: w.a / s, r: w.r / s, k: w.k / s, confidence: w.confidence };
}

export default async function run(draft: { text: string; meta?: Record<string, any> }) {
  const base: Weights =
    (draft.meta?.learning as Weights) || { v: 0.25, a: 0.25, r: 0.25, k: 0.25, confidence: 0.2 };

  const t = (draft.text || "").toLowerCase();
  let w: Weights = { ...base };

  // bump helpers
  const bump = (k: keyof Weights, amt: number) => {
    if (k === "confidence") return;
    // @ts-ignore
    w[k] = Math.min(1, Math.max(0, (w[k] as number) + amt));
  };

  // crude feature tags
  if (/(show|diagram|flow|screenshot|image)/.test(t)) bump("v", 0.1);
  if (/(say|tell|walk me through|sounds)/.test(t)) bump("a", 0.1);
  if (/(steps|exact|quote|table|code|define)/.test(t)) bump("r", 0.1);
  if (/(try|practice|demo|hands-on|rep|exercise)/.test(t)) bump("k", 0.1);

  w = normalize(w);
  w.confidence = Math.min(1, w.confidence + 0.05);

  draft.meta = { ...(draft.meta || {}), learning: w };
  return draft;
}