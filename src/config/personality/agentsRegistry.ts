import { AgentConfig } from '@/types/mcp';

export const empathyDetectorDefault: AgentConfig = {
  id: "empathy-detector",
  name: "Empathy Detector",
  phase: "pre",
  enabled: true,
  order: 1,
  instructions:
    "Detect user affect (valence, arousal). Return calibrated empathy hints. Never over-apologize. Stay concise.",
  promptTemplate:
    "Classify the last user message for sentiment (negative/neutral/positive), arousal (low/med/high), and flags: {stress,pain,confusion}. Return strict JSON.",
  tone: { preset: "spartan", notes: "Validate feelings in one short line only when severity is high." },
  api: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxOutputTokens: 300,
    responseFormat: "json",
    jsonSchema:
      '{"type":"object","properties":{"sentiment":{"type":"string"},"arousal":{"type":"string"},"flags":{"type":"array","items":{"type":"string"}}},"required":["sentiment","arousal","flags"]}',
  },
};

// Registry defaults for Personality (this file exports defaults, not state).
export const defaultPersonalityAgents: Record<string, AgentConfig> = {
  "empathy-detector": empathyDetectorDefault,
};