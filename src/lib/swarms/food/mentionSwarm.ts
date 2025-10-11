/**
 * Food Mention Swarm
 *
 * Write pipeline for "I ate X" mentions
 * Pipeline: NLU → Time Parser → Resolver → Aggregator → Validator → Logger
 */

import type { MacroSummary } from '../../cache/questionCache';
import { extractFoodEntities } from './nlu';
import { parseTime } from './timeParser';
import { resolveNutrition } from './resolver';
import { aggregateMacros } from './aggregator';
import { validateMacroData, type ValidationResult } from './validator';
import { logMeal, type LogMealInput, type LogMealResult } from './logger';

export interface FoodMentionResult {
  success: boolean;
  summary?: MacroSummary;
  validation?: ValidationResult;
  logResult?: LogMealResult;
  error?: string;
}

/**
 * Process food mention (write operation)
 */
export async function processFoodMention(
  userMessage: string,
  userId: string,
  timezone: string = 'America/New_York',
  source: 'chat' | 'voice' | 'camera' = 'chat',
  messageId?: string
): Promise<FoodMentionResult> {
  try {
    // Step 1: Extract food entities (NLU)
    const entities = await extractFoodEntities(userMessage);

    if (entities.length === 0) {
      return {
        success: false,
        error: 'No food items found in message'
      };
    }

    // Step 2: Parse time
    const parsedTime = parseTime(userMessage, timezone);

    // Step 3: Resolve nutrition data
    const nutritionData = await resolveNutrition(entities);

    // Step 4: Aggregate macros (pure math)
    const summary = aggregateMacros(nutritionData);

    // Step 5: Validate quality
    const validation = validateMacroData(summary);

    if (!validation.valid) {
      return {
        success: false,
        summary,
        validation,
        error: 'Validation failed: ' + validation.warnings.join(', ')
      };
    }

    // Step 6: Log to database
    const logInput: LogMealInput = {
      userId,
      summary,
      parsedTime,
      source,
      messageId
    };

    const logResult = await logMeal(logInput);

    return {
      success: logResult.success,
      summary,
      validation,
      logResult,
      error: logResult.error
    };
  } catch (error: any) {
    console.error('[mentionSwarm] Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
