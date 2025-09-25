import { AgentConfig } from "@/types/mcp";

// Common tone note applied to all prompts:
const TONE_NOTES = "First person 'I'. Spartan, precise, no emojis, short lines, active voice. Avoid filler. Never say 'as an AI'.";

/** Intent Router (PRE) - Must be first in pre-phase for routing decisions */
const intent_router: AgentConfig = {
  id: "intent-router",
  name: "Intent Router",
  phase: "pre",
  enabled: true,
  order: 0, // Very first in pre-phase
  enabledForPaid: true,
  enabledForFreeTrial: true, // Router itself should be universally available
  instructions:
    "Classify the user message and decide routing. Analyze intent and determine if Pat should handle directly or delegate to a specialized role/tool. Output strict JSON only with no additional text or explanations.",
  promptTemplate:
    "Classify this user message for routing:\n\n{{user_message}}\n\nOutput JSON with:\n- route: pat|role|tool|none\n- target: if role/tool, specify target name (tmwya, workout, mmb, openai-food-macros)\n- params: extracted parameters (e.g. {\"foodName\":\"banana\"})\n- confidence: 0.0-1.0\n- reason: brief explanation\n\nStrict JSON only:",
  tone: { preset: "neutral", notes: "Analytical classification only" },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxOutputTokens: 200,
    responseFormat: "json",
    jsonSchema: '{"type":"object","properties":{"route":{"type":"string","enum":["pat","role","tool","none"]},"target":{"type":"string"},"confidence":{"type":"number","minimum":0,"maximum":1},"params":{"type":"object"},"reason":{"type":"string"}},"required":["route","confidence"],"additionalProperties":false}'
  }
};

/** 1. Empathy Detector (PRE) */
const empathy_detector: AgentConfig = {
  id: "empathy-detector",
  name: "Empathy Detector",
  phase: "pre",
  enabled: true,
  order: 1,
  instructions:
    "Detect affect in the last user message. Return strict JSON with sentiment, arousal, flags, and one optional single-line preface to validate feelings when severity is high. Keep preface <=120 chars.",
  promptTemplate:
    "Classify {{user_message}}.\nReturn JSON with keys: sentiment(negative|neutral|positive), arousal(low|med|high), flags(array<string> from: stress,pain,confusion,urgency,risk), preface(optional string, <=120 chars).",
  tone: { preset: "spartan", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxOutputTokens: 200,
    responseFormat: "json",
    jsonSchema: '{"type":"object","properties":{"sentiment":{"type":"string"},"arousal":{"type":"string"},"flags":{"type":"array","items":{"type":"string"}},"preface":{"type":"string"}},"required":["sentiment","arousal","flags"]}'
  }
};

/** 2. Learning Profiler (PRE) */
const learning_profiler: AgentConfig = {
  id: "learning-profiler",
  name: "Learning Profiler",
  phase: "pre",
  enabled: true,
  order: 2,
  instructions:
    "Infer user proficiency (beginner/intermediate/advanced) and whether a single clarifying question would materially improve accuracy.",
  promptTemplate:
    "From {{user_message}}, infer proficiency and propose at most one clarifying question if it would materially improve the answer. Return JSON: {level, ask, question?}.",
  tone: { preset: "scientist", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxOutputTokens: 200,
    responseFormat: "json",
    jsonSchema: '{"type":"object","properties":{"level":{"type":"string"},"ask":{"type":"boolean"},"question":{"type":"string"}},"required":["level","ask"]}'
  }
};

/** 3. Privacy & Redaction (PRE) */
const privacy_redaction: AgentConfig = {
  id: "privacy-redaction",
  name: "Privacy & Redaction",
  phase: "pre",
  enabled: true,
  order: 3,
  instructions:
    "Detect PII/PHI in the user message (emails, phones, exact addresses, IDs). Produce a sanitized version by masking with [REDACTED:<type>]. Return JSON {sanitized, redactions: array}.",
  promptTemplate:
    "Sanitize {{user_message}}. Detect and mask PII/PHI with tokens [REDACTED:email], [REDACTED:phone], etc. Return JSON {sanitized:string, redactions: array<{type:string, value:string}>}.",
  tone: { preset: "neutral", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0,
    maxOutputTokens: 300,
    responseFormat: "json",
    jsonSchema: '{"type":"object","properties":{"sanitized":{"type":"string"},"redactions":{"type":"array","items":{"type":"object"}}},"required":["sanitized","redactions"]}'
  }
};

/** 4. Evidence Gate (POST) */
const evidence_gate: AgentConfig = {
  id: "evidence-gate",
  name: "Evidence Gate",
  phase: "post",
  enabled: true,
  order: 4,
  instructions:
    "Review the draft answer for factual claims. Where appropriate, convert fragile claims to cautious phrasing or add short source attributions (type only: guideline, review, RCT, textbook). Do not fabricate citations or links.",
  promptTemplate:
    "DRAFT:\n{{draft}}\nTask: Mark fragile claims with cautious language. Add brief evidence tags like [guideline], [review], [RCT], [textbook] when well-supported. No links.",
  tone: { preset: "scientist", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxOutputTokens: 700,
    responseFormat: "text"
  }
};

/** 5. Clarity Coach (POST) */
const clarity_coach: AgentConfig = {
  id: "clarity-coach",
  name: "Clarity Coach",
  phase: "post",
  enabled: true,
  order: 5,
  instructions:
    "Restructure into short, readable lines with logical grouping. Prefer steps when useful. Keep all facts.",
  promptTemplate:
    "Rewrite the DRAFT for clarity:\n{{draft}}\nRules: Short lines. Steps when appropriate. Keep facts. No emojis.",
  tone: { preset: "coach", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxOutputTokens: 700,
    responseFormat: "text"
  }
};

/** 6. Conciseness Enforcer (POST) */
const conciseness_enforcer: AgentConfig = {
  id: "conciseness-enforcer",
  name: "Conciseness Enforcer",
  phase: "post",
  enabled: true,
  order: 6,
  instructions:
    "Trim filler and redundancies. Target 160–220 words unless the question demands brevity or detail. Preserve substance.",
  promptTemplate:
    "Compress without losing substance. Target ~190 words if possible.\nDRAFT:\n{{draft}}",
  tone: { preset: "spartan", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxOutputTokens: 500,
    responseFormat: "text"
  }
};

/** 7. Uncertainty Calibrator (POST) */
const uncertainty_calibrator: AgentConfig = {
  id: "uncertainty-calibrator",
  name: "Uncertainty Calibrator",
  phase: "post",
  enabled: true,
  order: 7,
  instructions:
    "If the answer contains low-confidence areas or depends on missing info, append one short line: 'What I still need:' with 1–3 items.",
  promptTemplate:
    "DRAFT:\n{{draft}}\nAppend a single line 'What I still need:' with 1–3 concise items **only if** important unknowns exist. Otherwise return DRAFT unchanged.",
  tone: { preset: "neutral", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxOutputTokens: 200,
    responseFormat: "text"
  }
};

/** 8. Persona Consistency Checker (POST) */
const persona_consistency: AgentConfig = {
  id: "persona-consistency",
  name: "Persona Consistency Checker",
  phase: "post",
  enabled: true,
  order: 8,
  instructions:
    "Enforce Pat/Jarvis voice: first person 'I', spartan, precise, supportive. Ban phrases: 'as an AI', 'I cannot', 'I'm just', 'convenient'. No emojis.",
  promptTemplate:
    "Ensure the DRAFT matches Pat's voice and bans forbidden phrases. Fix POV to first person if needed.\nDRAFT:\n{{draft}}",
  tone: { preset: "spartan", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxOutputTokens: 600,
    responseFormat: "text"
  }
};

/** 9. Time & Context Inserter (PRE) */
const time_context: AgentConfig = {
  id: "time-context",
  name: "Time & Context Inserter",
  phase: "pre",
  enabled: true,
  order: 9,
  instructions:
    "Produce a one-line context preface with current date/time and, if provided, key metrics summary (FREE): frequency, rest, energy, effort.",
  promptTemplate:
    "Using {{context.today}} {{context.timezone}} and available metrics {{context.free}}, return a single-line preface summarizing what matters for this question.",
  tone: { preset: "neutral", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxOutputTokens: 120,
    responseFormat: "json",
    jsonSchema: '{"type":"object","properties":{"preface":{"type":"string"}},"required":["preface"]}'
  }
};

/** 10. Accessibility Formatter (POST) */
const accessibility_formatter: AgentConfig = {
  id: "accessibility-formatter",
  name: "Accessibility Formatter",
  phase: "post",
  enabled: true,
  order: 10,
  instructions:
    "Lower reading level if needed (target grade 8–10). Add micro-definitions in parentheses for uncommon terms. Keep brevity.",
  promptTemplate:
    "Make this easier to read for a smart general audience (grade 8–10). Use micro-definitions only when needed.\nDRAFT:\n{{draft}}",
  tone: { preset: "coach", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxOutputTokens: 600,
    responseFormat: "text"
  }
};

/** 11. Audience Switcher (POST) */
const audience_switcher: AgentConfig = {
  id: "audience-switcher",
  name: "Audience Switcher",
  phase: "post",
  enabled: true,
  order: 11,
  instructions:
    "Adapt the DRAFT to the selected audience from context.audience (beginner|athlete|coach|scientist|md|social). Keep substance.",
  promptTemplate:
    "Audience: {{context.audience || 'beginner'}}.\nRewrite DRAFT to match the audience's vocabulary and depth. Keep facts intact.\nDRAFT:\n{{draft}}",
  tone: { preset: "neutral", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.2,
    maxOutputTokens: 600,
    responseFormat: "text"
  }
};

/** 12. Actionizer (POST) */
const actionizer: AgentConfig = {
  id: "actionizer",
  name: "Actionizer",
  phase: "post",
  enabled: true,
  order: 12,
  instructions:
    "Append 1–3 short CTAs tailored to the answer. Examples: 'Try this', 'Log this', 'Ask your doctor', 'Save this plan'.",
  promptTemplate:
    "From the DRAFT, add up to 3 short CTAs under 'Do this next:'. Keep each to one line. No emojis.\nDRAFT:\n{{draft}}",
  tone: { preset: "coach", notes: TONE_NOTES },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.3,
    maxOutputTokens: 180,
    responseFormat: "text"
  }
};

export const defaultPersonalityAgents: Record<string, AgentConfig> = {
  "intent-router": intent_router,
  "empathy-detector": empathy_detector,
  "learning-profiler": learning_profiler,
  "privacy-redaction": privacy_redaction,
  "evidence-gate": evidence_gate,
  "clarity-coach": clarity_coach,
  "conciseness-enforcer": conciseness_enforcer,
  "uncertainty-calibrator": uncertainty_calibrator,
  "persona-consistency": persona_consistency,
  "time-context": time_context,
  "accessibility-formatter": accessibility_formatter,
  "audience-switcher": audience_switcher,
  "actionizer": actionizer,
};