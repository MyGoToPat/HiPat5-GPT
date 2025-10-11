/**
 * Food Question Swarm
 *
 * Read-only pipeline for "what are the macros of X?" questions
 * Pipeline: NLU → Resolver → Aggregator → Validator
 * Returns MacroSummary without logging
 */

import type { MacroSummary } from '../../cache/questionCache';
import { extractFoodEntities } from './nlu';
import { resolveNutrition } from './resolver';
import { aggregateMacros } from './aggregator';
import { validateMacroData, type ValidationResult } from './validator';

export interface FoodQuestionResult {
  success: boolean;
  summary?: MacroSummary;
  validation?: ValidationResult;
  error?: string;
}

/**
 * Process food question (read-only)
 */
export async function processFoodQuestion(userMessage: string): Promise<FoodQuestionResult> {
  try {
    // Step 1: Extract food entities (NLU)
    const entities = await extractFoodEntities(userMessage);

    if (entities.length === 0) {
      return {
        success: false,
        error: 'No food items found in message'
      };
    }

    // Step 2: Resolve nutrition data
    const nutritionData = await resolveNutrition(entities);

    // Step 3: Aggregate macros (pure math)
    const summary = aggregateMacros(nutritionData);

    // Step 4: Validate quality
    const validation = validateMacroData(summary);

    return {
      success: validation.valid,
      summary,
      validation
    };
  } catch (error: any) {
    console.error('[questionSwarm] Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
