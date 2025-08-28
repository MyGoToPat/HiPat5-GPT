export type Tier = 'freemium' | 'beta' | 'paid' | 'enterprise';

export interface StyleProfile {
  modeMix: { auditory: number; visual: number; kinesthetic: number };
  brevity: 'short' | 'medium' | 'long';
  cadence: 'slow' | 'normal' | 'fast';
}

export interface ExpertiseProfile {
  topic: string;
  level: 'baseline' | 'advanced' | 'phd';
  sources?: string[];
}

export interface PersonaContext {
  userId: string;
  tier: Tier;
  goals?: Record<string, unknown>;
  allergies?: string[];
  styleProfile?: StyleProfile;
  passiveMode?: boolean; // per PRD passive-mode controller
  dayTargets?: { calories?: number; protein_g?: number; fat_g?: number; carbs_g?: number };
  dayTotals?: { calories?: number; protein_g?: number; fat_g?: number; carbs_g?: number };
}

export interface PersonaRequest {
  text: string;              // user message to Pat
  topic?: string;            // optional topic hint
  nowISO?: string;           // timestamp
}

export interface PersonaDraft {
  text: string;
  notes?: string[];
}

export interface PersonaResponse {
  allowed: boolean;
  text: string;
  safetyBlocked?: boolean;
  variant?: string;
  deltas?: SentinelDelta;
}

export interface SentinelDelta {
  day: string;
  calories?: { used: number; target: number };
  protein?: { gUsed: number; gTarget: number };
  fat?: { gUsed: number; gTarget: number };
  carbs?: { gUsed: number; gTarget: number };
}