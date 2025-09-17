export type AgentPhase = 'pre' | 'generate' | 'post';
export type TonePreset = 'spartan' | 'neutral' | 'coach' | 'scientist';
export type ApiProvider = 'openai';
export type ApiResponseFormat = 'text' | 'json';

export type ApiConfig = {
  provider: ApiProvider;
  model: string;
  temperature: number;
  maxOutputTokens: number;
  responseFormat?: ApiResponseFormat;
  jsonSchema?: string | null;
};

export type AgentConfig = {
  id: string;            // unique slug: e.g., "empathy-detector"
  name: string;          // display name
  phase: AgentPhase;     // pre | generate | post
  enabled: boolean;
  order: number;         // execution order within Personality swarm
  instructions: string;  // system rules enforced by the agent
  promptTemplate: string;// prompt chunk used by this agent
  tone: { preset: TonePreset; notes?: string };
  api: ApiConfig;
};