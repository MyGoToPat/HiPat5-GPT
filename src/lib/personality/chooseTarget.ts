// src/lib/personality/chooseTarget.ts
export const ALLOWED_TARGETS = new Set([
  "tmwya",
  "workout",
  "mmb",
  "openai-food-macros",
  "askMeAnything"
]);

export function chooseTarget(route?: string, target?: string, confidence?: number) {
  let chosen = target;
  if (!chosen || !ALLOWED_TARGETS.has(chosen) || (typeof confidence === "number" && confidence < 0.5) || route === "none") {
    chosen = "askMeAnything";
  }
  return chosen;
}