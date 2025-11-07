// Gemini provider for web research with answer-first formatting

import { getSupabase } from '../../../lib/supabase';

export interface WebResearchResult {
  text: string;
  source?: string;
  nextStep?: string;
}

export async function callGeminiWebResearch(prompt: string): Promise<WebResearchResult> {
  const supabase = getSupabase();

  const { data, error } = await supabase.functions.invoke("gemini-chat", {
    body: { q: prompt }
  });

  if (error) throw error;

  // Expected shape: { answer: string, source: string, next_step: string }
  const ans = (data?.answer ?? "").trim();
  const src = (data?.source ?? "").trim();
  const nxt = (data?.next_step ?? "").trim();

  // Return a unified shape upstream
  return {
    text: ans,
    source: src || undefined,
    nextStep: nxt || undefined
  };
}
