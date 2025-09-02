export type LearningWeights = { v: number; a: number; r: number; k: number; confidence: number };

export interface PersonaContext {
  userId: string;
  tier?: string;
  tz?: string;
  learning?: LearningWeights;
  nowISO?: string;
}

export interface PersonaDraft {
  text: string;
  meta?: Record<string, any>;
}

export interface PersonaAgent {
  id: string;                // stable id, kebab-case
  title: string;             // human label
  order: number;             // pipeline order
  enabled: boolean;
  params?: Record<string, any>;
  run: (ctx: PersonaContext, draft: PersonaDraft) => Promise<PersonaDraft>;
}