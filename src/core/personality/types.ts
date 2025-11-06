/**
 * PERSONALITY SYSTEM TYPES
 * Shared types for Pat's voice-first personality
 */

export type DetailLevel = 'simple' | 'technical';
export type ExpertiseLevel = 'novice' | 'intermediate' | 'advanced' | 'expert';
export type PromptPhase = 'pre' | 'core' | 'post';

export interface PersonalityState {
  oq?: string;              // Original Question (≤10 words)
  detail: DetailLevel;      // Current detail level
  expertise: ExpertiseLevel; // Detected user expertise
  turnCount: number;        // Number of turns in thread
}

export interface PersonalityOutput {
  text: string;             // Final reply text
  state: PersonalityState;  // Updated state
  identityShown: boolean;   // If intro/how-to was triggered
}

