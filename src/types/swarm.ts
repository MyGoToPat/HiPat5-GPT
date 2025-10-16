export interface ResponseObject {
  type: 'nutrition' | 'workout' | 'general' | 'kpi' | 'mmb';
  payload: Record<string, any>;
  protected_fields: string[];
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    field?: string;
  }>;
  suggested_tone?: 'empathetic' | 'motivational' | 'factual' | 'casual';
  followups: string[];
  metadata?: Record<string, any>;
}

export interface MemoryRow {
  id: string;
  user_id: string;
  tier: 'ephemeral' | 'short_term' | 'long_term';
  key: string;
  value: any;
  source: 'explicit' | 'inferred' | 'system';
  confidence: number;
  ttl: string | null;
  topics: string[];
  is_pii: boolean;
  conflict_priority: number;
  created_at: string;
  updated_at: string;
}

export interface FilterResult {
  annotations: Array<{
    item_index: number;
    type: 'warning' | 'info' | 'suggestion';
    message: string;
    reason: string;
  }>;
  substitutions: Array<{
    item_index: number;
    original: string;
    suggested: string;
    reason: string;
  }>;
  warnings: Array<{
    severity: 'high' | 'medium' | 'low';
    message: string;
    diet_type?: string;
  }>;
}

export interface SwarmAgent {
  id: string;
  name: string;
  slug: string;
  phase: 'pre' | 'core' | 'filter' | 'presenter' | 'post' | 'render';
  order: number;
  enabled: boolean;
  model?: string;
  prompt?: string;
  io: {
    in: string;
    out: string;
  };
  config?: Record<string, any>;
}

export interface SwarmManifest {
  id: string;
  name: string;
  version: number;
  status: 'draft' | 'published';
  rollout_percentage: number;
  target_audience: 'beta' | 'paid' | 'all';
  agents: SwarmAgent[];
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface ChatSummaryWithEmbedding {
  id: string;
  session_id: string;
  user_id: string;
  summary: string;
  topics: string[];
  main_discussion_points: string[];
  facts: Record<string, any>;
  embedding: number[];
  message_count: number;
  created_at: string;
}

export type DietType = 'balanced' | 'keto' | 'low_carb' | 'carnivore' | 'vegetarian' | 'vegan';

export interface DietaryPreferences {
  diet_type: DietType;
  macro_overrides?: {
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    fiber_g?: number;
  };
  allergens: string[];
  religious_restrictions?: ('halal' | 'kosher' | 'none')[];
  persona_override?: boolean;
}
