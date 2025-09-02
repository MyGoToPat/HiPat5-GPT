// default export: run(draft) -> draft
export default async function run(draft: { text: string; meta?: Record<string, any> }) {
  const t = (draft.text || "").toLowerCase();
  const stressed = /(frustrated|upset|worried|urgent|devastated|anxious)/.test(t);
  draft.meta = { ...(draft.meta || {}), mood: stressed ? "stressed" : "calm" };
  return draft;
}