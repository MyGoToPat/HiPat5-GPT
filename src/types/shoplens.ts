export interface Ingredient {
  name: string;
  amount?: number;
  unit?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface Claim {
  text: string;
  category: 'performance' | 'health' | 'weight' | 'other';
  credibility?: 'verified' | 'questionable' | 'unsubstantiated';
}

export type Verdict = 'safe' | 'caution' | 'avoid';

export interface Analysis {
  productName: string;
  ingredients: Ingredient[];
  claims: Claim[];
  verdict: Verdict;
  notes: string[];
  confidence: number;
}

export interface UserFeedback {
  source: string;
  snippet: string;
  rating?: number;
  timestamp: Date;
}

export interface ShopLensConfig {
  sensitivity: number;
  banned: string[];
  caution: string[];
  intendedUse: 'performance' | 'health' | 'weight' | 'other';
  strictLabelMode: boolean;
  allowProprietaryBlends: boolean;
}