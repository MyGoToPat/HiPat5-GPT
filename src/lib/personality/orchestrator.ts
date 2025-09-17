import { AgentConfig } from "@/types/mcp";
import { renderTemplate } from "@/lib/personality/template";
import { getPersonalityAgents, getPersonalitySwarm } from "@/state/personalityStore";

type RunInput = {
  userMessage: string;
  context: Record<string, any>; // metrics, time, user profile, etc.
};

const GENERATOR_MODEL = "gpt-4o-mini";
const PROXY_PATH = "/functions/v1/ai_proxy"; // if missing, we show payload preview

async function callProxy(payload: any): Promise<{ ok: boolean; text?: string; json?: any; status: number }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    
    // Try to attach Supabase auth headers if available (non-breaking)
    try {
      // Check if Supabase client is available
      const { getSupabase } = await import("@/lib/supabase");
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      
      // Add anon key if available
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (anonKey) {
        headers.apikey = anonKey;
      }
    } catch {
      // Ignore if Supabase not available - fall back to plain fetch
    }

    const res = await fetch(PROXY_PATH, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    
    const txt = await res.text();
    return { ok: res.ok, text: txt, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function runPersonalityPipeline({ userMessage, context }: RunInput) {
  // Load enabled agents in configured order
  const agentsRec = getPersonalityAgents();
  const ordered = getPersonalitySwarm()
    .map((id) => agentsRec[id])
    .filter(Boolean)
    .filter((a) => a.enabled);

  // Split by phase
  const pre = ordered.filter((a) => a.phase === "pre");
  const post = ordered.filter((a) => a.phase === "post");

  // PRE: accumulate notes + sanitized message
  let workingUserMessage = userMessage;
  let preNotes: string[] = [];

  for (const a of pre) {
    const payload = buildPayloadForAgent(a, workingUserMessage, context);
    if (a.api.responseFormat === "json") {
      const res = await callProxy(payload);
      if (res.ok && res.text) {
        try {
          const data = JSON.parse(res.text);
          if (a.id === "privacy-redaction" && data?.sanitized) {
            workingUserMessage = data.sanitized;
          }
          // For empathy, profiler, time/context -> render helpful preface line if provided
          if (data?.preface) preNotes.push(String(data.preface));
        } catch {
          // ignore parse errors in UI-only mode
        }
      } else {
        // proxy missing: create local preview preface where possible
        if (a.id === "time-context") {
          const preface = `[time] ${new Date().toLocaleString()} • ${context?.timezone ?? "local"}`;
          preNotes.push(preface);
        }
      }
    } else {
      // text response agent (rare in pre) — call or fallback
      const res = await callProxy(payload);
      if (res.ok && res.text) preNotes.push(res.text);
    }
  }

  // GENERATE: one main answer in Pat/Jarvis voice
  const personaSystem =
    "You are Pat — Hyper Intelligent Personal Assistant Team. Speak in first person as 'I'. Spartan, precise, helpful. No emojis. Short lines. Active voice. Avoid filler. Never say 'as an AI'. Keep answers safe, scientific, and practical.";

  const systemPreface = preNotes.join("\n");
  const generatePayload = {
    provider: "openai",
    model: GENERATOR_MODEL,
    temperature: 0.3,
    max_output_tokens: 800,
    messages: [
      { role: "system", content: personaSystem },
      ...(systemPreface ? [{ role: "system", content: systemPreface }] : []),
      { role: "user", content: workingUserMessage },
    ],
  };

  let draft = "";
  const genRes = await callProxy(generatePayload);
  if (genRes.ok && genRes.text) {
    draft = genRes.text;
  } else {
    // proxy missing: return preview
    return {
      ok: false,
      previewOnly: true,
      stage: "generate",
      payload: generatePayload,
      note: "Edge Function ai_proxy not found. Showing payload preview.",
    };
  }

  // POST: sequential rewrites/guards
  let answer = draft;
  for (const a of post) {
    const payload = buildRewritePayload(a, answer, context);
    const res = await callProxy(payload);
    if (res.ok && res.text) {
      answer = res.text;
    } else {
      // if proxy missing midway, return best we have with preview of the current step
      return {
        ok: false,
        previewOnly: true,
        stage: `post:${a.id}`,
        partial: answer,
        payload,
        note: "Edge Function ai_proxy not found during post-processing. Returning draft + payload preview.",
      };
    }
  }

  return { ok: true, answer };
}

function buildPayloadForAgent(agent: AgentConfig, userMessage: string, context: Record<string, any>) {
  const instructions = renderTemplate(agent.instructions, { context });
  const prompt = renderTemplate(agent.promptTemplate, { user_message: userMessage, context });
  return {
    provider: "openai",
    model: agent.api.model,
    temperature: agent.api.temperature,
    max_output_tokens: agent.api.maxOutputTokens,
    response_format: agent.api.responseFormat,
    json_schema: agent.api.responseFormat === "json" ? agent.api.jsonSchema ?? null : null,
    messages: [
      { role: "system", content: instructions },
      { role: "system", content: prompt },
    ],
  };
}

function buildRewritePayload(agent: AgentConfig, draftAnswer: string, context: Record<string, any>) {
  const instructions = renderTemplate(agent.instructions, { context });
  const prompt = renderTemplate(agent.promptTemplate, { draft: draftAnswer, context });
  return {
    provider: "openai",
    model: agent.api.model,
    temperature: agent.api.temperature,
    max_output_tokens: agent.api.maxOutputTokens,
    response_format: agent.api.responseFormat,
    json_schema: agent.api.responseFormat === "json" ? agent.api.jsonSchema ?? null : null,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: prompt },
    ],
  };
}