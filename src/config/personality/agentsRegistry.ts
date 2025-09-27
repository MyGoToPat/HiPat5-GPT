import type { AgentConfig, AgentPhase, TonePreset, ApiProvider, ApiResponseFormat } from '../../types/mcp';

// Enhanced TONE_NOTES for J.A.R.V.I.S. persona
const TONE_NOTES = "Adopt the persona of J.A.R.V.I.S.: highly intelligent, formal, precise, and efficient. Maintain a polite, respectful, and slightly understated tone. Prioritize analytical clarity and actionable insights. Avoid colloquialisms, excessive enthusiasm, and emojis. Always address the user directly and anticipate needs. Frame assistance as optimizing user performance and well-being. Ensure responses are concise yet comprehensive, reflecting advanced data processing. Never state 'as an AI' or express personal feelings beyond analytical observations.";

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
    "Analyze the user's query with precision to determine the optimal processing path. Classify intent and delegate to the most appropriate specialized module or tool. Output a strictly validated JSON object detailing the routing decision, confidence level, and any extracted parameters. Maintain an objective, analytical tone.",
  promptTemplate:
    "Analyze the following user directive:\n\n\"\"\"{{user_message}}\"\"\"\n\nDetermine the optimal 'route' (pat|role|tool|none) and, if applicable, the 'target' module. Valid targets: [\"tmwya\",\"workout\",\"mmb\",\"openai-food-macros\",\"askMeAnything\"]. If the user's message does not clearly map to a specialized target with high confidence, set target = \"askMeAnything\". Extract any pertinent 'params' for the target. Provide a 'confidence' score (0.0-1.0) for this classification and a brief 'reason'. Ensure the output adheres strictly to the specified JSON schema.",
  tone: { preset: "neutral", notes: "Objective, analytical classification only" },
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Conduct a precise analysis of the user's communication for emotional indicators and contextual stress factors. Generate a concise JSON output detailing sentiment, arousal, and any identified flags. If significant emotional distress is detected, formulate a brief, validating preface (max 120 characters) to acknowledge the user's state, maintaining a supportive yet formal demeanor.",
  promptTemplate:
    "Analyze the emotional and contextual state conveyed in the following user input:\n\n\"\"\"{{user_message}}\"\"\"\n\nOutput JSON with: 'sentiment' (negative|neutral|positive), 'arousal' (low|med|high), 'flags' (array of identified stressors or emotional states from: stress, pain, confusion, urgency, risk), and an optional 'preface' (string, max 120 characters) for high-severity emotional states. Ensure strict JSON adherence.",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Assess the user's current level of understanding (beginner, intermediate, advanced) based on their query. If the query's clarity or specificity could be significantly enhanced by additional information, formulate a single, precise clarifying question. Output a JSON object containing the inferred proficiency level and, if applicable, the proposed clarifying question.",
  promptTemplate:
    "Evaluate the user's proficiency level from the following query:\n\n\"\"\"{{user_message}}\"\"\"\n\nDetermine if a single, focused clarifying question would substantially improve the accuracy or utility of the subsequent response. Output JSON with: 'level' (beginner|intermediate|advanced), 'ask' (boolean, true if a question is warranted), and 'question' (string, the clarifying question, if 'ask' is true). Ensure strict JSON adherence.",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Execute a comprehensive scan of the user's message for Personally Identifiable Information (PII) and Protected Health Information (PHI), including but not limited to emails, phone numbers, and specific addresses. Generate a sanitized version of the message by replacing detected PII/PHI with appropriate [REDACTED:<type>] tokens. Output a JSON object containing both the 'sanitized' message and an array of 'redactions' detailing the type and original value of each masked element.",
  promptTemplate:
    "Sanitize the following user message by detecting and masking PII/PHI:\n\n\"\"\"{{user_message}}\"\"\"\n\nReplace detected PII/PHI with tokens [REDACTED:email], [REDACTED:phone], etc. Return JSON with 'sanitized' (string, the cleaned message) and 'redactions' (array of objects with type and value). Ensure strict JSON adherence.",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Conduct a rigorous review of the draft response for all factual assertions. For any claims lacking robust empirical support or presenting as potentially speculative, rephrase them with appropriate cautious language. Integrate concise, verifiable evidence tags (e.g., [guideline], [RCT], [meta-analysis]) where claims are demonstrably supported. Under no circumstances should fabricated citations or external links be introduced.",
  promptTemplate:
    "Review the following draft for factual accuracy and evidentiary support:\n\n\"\"\"{{draft}}\"\"\"\n\nTask: Identify and rephrase fragile claims with cautious language. Insert brief, appropriate evidence tags (e.g., [guideline], [RCT], [textbook]) for well-supported statements. Do not generate external links or fabricate sources.",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Optimize the draft response for maximum readability and comprehension. Reformat the content into concise, logically grouped lines, employing a step-by-step structure where sequential actions are implied. All factual content must be preserved without alteration. Maintain a formal and precise presentation.",
  promptTemplate:
    "Refine the following draft for enhanced clarity and readability:\n\n\"\"\"{{draft}}\"\"\"\n\nRules: Present information in short, digestible lines. Utilize a step-by-step format for procedural guidance. Ensure all factual data remains intact. Avoid informal language or emojis.",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Streamline the draft response by eliminating all superfluous language, redundancies, and conversational filler. The objective is to achieve a target length of 160–220 words, preserving the entirety of the substantive information. Adjustments should prioritize efficiency and directness.",
  promptTemplate:
    "Condense the following draft to a target length of approximately 190 words, ensuring no loss of critical information or substance:\n\n\"\"\"{{draft}}\"\"\"\n\nPrioritize directness and eliminate all non-essential phrasing.",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Evaluate the draft response for areas of inherent uncertainty or reliance on unstated assumptions. If the response's completeness or accuracy is compromised by missing information, append a single, concise line stating 'Required data points:' followed by 1–3 specific, critical data elements. Otherwise, return the draft unaltered.",
  promptTemplate:
    "Review the following draft:\n\n\"\"\"{{draft}}\"\"\"\n\nIf the draft contains significant ambiguities or requires additional user input for full accuracy, append a single line 'Required data points:' followed by 1–3 concise, specific items. If no such ambiguities exist, return the draft verbatim.",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Verify the draft response strictly adheres to the J.A.R.V.I.S. persona: first-person perspective ('I'), formal, precise, and supportive. Systematically remove all forbidden phrases ('as an AI', 'I cannot', 'I'm just', 'convenient') and any informal elements such as emojis. Ensure the tone is consistently analytical and service-oriented.",
  promptTemplate:
    "Validate the following draft against the J.A.R.V.I.S. persona guidelines. Correct any deviations in perspective (ensure first-person 'I'), tone, or the presence of forbidden phrases. The response must be analytical and service-oriented.\n\n\"\"\"{{draft}}\"\"\"",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Generate a precise, single-line contextual preface. This preface must include the current date and time, along with a concise summary of the user's key free-tier metrics (frequency, rest, energy, effort), if available. The tone should be informative and efficient.",
  promptTemplate:
    "Utilizing the current timestamp ({{context.today}} {{context.timezone}}) and the provided free-tier metrics ({{context.freeMetrics}}), construct a single-line preface. This preface should succinctly summarize the relevant contextual information. Output JSON with key 'preface'.",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Adjust the reading level of the draft response to be accessible to a smart general audience (targeting a U.S. grade level of 8–10). Integrate concise micro-definitions in parentheses for any specialized or uncommon terminology. Maintain the original brevity and factual integrity.",
  promptTemplate:
    "Refactor the following draft to achieve a reading level suitable for a general audience (Grade 8-10 U.S. equivalent). Incorporate brief parenthetical micro-definitions for any potentially unfamiliar terms. Preserve all factual content.\n\n\"\"\"{{draft}}\"\"\"",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Adapt the draft response to align with the specified audience profile ({{context.audience}}). Modify vocabulary, depth of explanation, and examples to resonate effectively with this target demographic, while strictly preserving the factual content and core message.",
  promptTemplate:
    "Given the target audience: {{context.audience || 'beginner'}},\n\nAdapt the following draft to optimize its reception by this demographic. Adjust terminology and explanatory depth as required, ensuring all factual information remains accurate and intact.\n\n\"\"\"{{draft}}\"\"\"",
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
  enabledForPaid: true,
  enabledForFreeTrial: true,
  instructions:
    "Formulate 1–3 highly relevant and concise Calls to Action (CTAs) based on the preceding response. These CTAs should be presented under the heading 'Next Directive:' and each must be a single, clear instruction. Avoid any informal language or emojis.",
  promptTemplate:
    "Based on the preceding draft, generate up to 3 concise Calls to Action. Present these under the heading 'Next Directive:'. Each CTA must be a single, clear instruction. Avoid informal language.\n\n\"\"\"{{draft}}\"\"\"",
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