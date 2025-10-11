/**
 * Swarm 2.2 Orchestrator
 *
 * Main pipeline: Intent → Role Swarm → Format → Tone
 * Replaces existing orchestrator with cleaner architecture.
 */

import { classifyIntent, type IntentResult } from './intentClassifier.v2';
import { processFoodQuestion } from '../swarms/food/questionSwarm';
import { processFoodMention } from '../swarms/food/mentionSwarm';
import { calculateRemaining } from '../swarms/kpi/remainingSwarm';
import { undoLastMeal } from '../swarms/food/undoSwarm';
import { QuestionCacheManager } from '../cache/questionCache';
import {
  formatFoodQuestion,
  formatFoodLogged,
  formatKPIAnswer,
  formatUndoConfirmation,
  formatGeneral,
  type FormattedResponse
} from './dataFormatter';
import { shapeTone, type ToneStyle } from './toneShaper';
import { TelemetryCollector, generateSessionId } from '../telemetry/events';

export interface OrchestratorInput {
  userMessage: string;
  userId: string;
  timezone?: string;
  tonePreference?: ToneStyle;
  context?: {
    messageId?: string;
    source?: 'chat' | 'voice' | 'camera';
  };
}

export interface OrchestratorResult {
  success: boolean;
  answer: string;
  metadata: {
    intent: string;
    type: string;
    confidence: number;
    skipLLM?: boolean;
    telemetry?: any;
  };
  error?: string;
}

/**
 * Run Swarm 2.2 pipeline
 */
export async function runSwarmV2Pipeline(input: OrchestratorInput): Promise<OrchestratorResult> {
  const sessionId = generateSessionId();
  const telemetry = new TelemetryCollector(input.userId, sessionId);
  const timezone = input.timezone || 'America/New_York';
  const tonePreference = input.tonePreference || 'concise';

  try {
    // Stage 1: Classify intent
    const intentStart = Date.now();
    const intent = await classifyIntent(input.userMessage);
    telemetry.log({
      eventType: 'intent_classified',
      stage: 'intent',
      durationMs: Date.now() - intentStart,
      success: true,
      intent: intent.intent,
      confidence: intent.confidence
    });

    // Stage 2: Route to appropriate swarm
    const swarmStart = Date.now();
    let formatted: FormattedResponse;

    switch (intent.intent) {
      case 'food_question': {
        const result = await processFoodQuestion(input.userMessage);

        if (!result.success || !result.summary || !result.validation) {
          formatted = formatGeneral(result.error || 'Could not process food question');
          break;
        }

        // Cache for "log that" follow-up
        QuestionCacheManager.save(result.summary, input.userMessage, input.userId);

        formatted = formatFoodQuestion(result.summary, result.validation);
        telemetry.log({
          eventType: 'response_formatted',
          stage: 'format',
          durationMs: Date.now() - swarmStart,
          success: true,
          itemCount: result.summary.items.length
        });
        break;
      }

      case 'food_mention': {
        const result = await processFoodMention(
          input.userMessage,
          input.userId,
          timezone,
          input.context?.source || 'chat',
          input.context?.messageId
        );

        if (!result.success || !result.summary) {
          formatted = formatGeneral(result.error || 'Could not log meal');
          break;
        }

        formatted = formatFoodLogged(result.summary, result.logResult?.isDuplicate);
        telemetry.log({
          eventType: 'meal_logged',
          stage: 'store',
          durationMs: Date.now() - swarmStart,
          success: true,
          itemCount: result.summary.items.length,
          metadata: { duplicate: result.logResult?.isDuplicate }
        });
        break;
      }

      case 'food_log_followup': {
        const cachedSummary = QuestionCacheManager.get(input.userId);

        if (!cachedSummary) {
          formatted = formatGeneral('No recent food question to log. Ask me about food first!');
          break;
        }

        const result = await processFoodMention(
          `I ate ${cachedSummary.items.map(i => `${i.quantity}${i.unit} ${i.name}`).join(', ')}`,
          input.userId,
          timezone,
          input.context?.source || 'chat',
          input.context?.messageId
        );

        formatted = result.success
          ? formatFoodLogged(cachedSummary, result.logResult?.isDuplicate)
          : formatGeneral(result.error || 'Could not log meal');

        // Clear cache after logging
        QuestionCacheManager.clear(input.userId);
        break;
      }

      case 'kpi_query': {
        const todayBounds = getTodayBounds(timezone);
        const result = await calculateRemaining(input.userId, todayBounds);

        formatted = result.success && result.remaining
          ? formatKPIAnswer(result.remaining)
          : formatGeneral(result.error || 'Could not calculate remaining macros');

        telemetry.log({
          eventType: 'response_formatted',
          stage: 'format',
          durationMs: Date.now() - swarmStart,
          success: result.success
        });
        break;
      }

      case 'undo_meal': {
        const result = await undoLastMeal(input.userId);
        formatted = formatUndoConfirmation(result);

        telemetry.log({
          eventType: 'response_formatted',
          stage: 'format',
          durationMs: Date.now() - swarmStart,
          success: result.success
        });
        break;
      }

      case 'food_correction': {
        // TODO: Implement correction logic
        formatted = formatGeneral('Correction feature coming soon!');
        break;
      }

      case 'workout_mention':
      case 'workout_question': {
        formatted = formatGeneral('Workout tracking coming soon!');
        break;
      }

      case 'general':
      default: {
        formatted = formatGeneral(input.userMessage);
        break;
      }
    }

    // Stage 3: Optional tone shaping
    let finalAnswer = formatted.text;

    if (formatted.metadata?.skipLLM !== true && tonePreference !== 'concise' && tonePreference !== 'off') {
      const toneStart = Date.now();
      finalAnswer = await shapeTone(formatted.text, {
        style: tonePreference,
        preserveNumbers: true
      });
      telemetry.log({
        eventType: 'tone_shaped',
        stage: 'tone',
        durationMs: Date.now() - toneStart,
        success: true
      });
    }

    const summary = telemetry.getSummary();

    return {
      success: true,
      answer: finalAnswer,
      metadata: {
        intent: intent.intent,
        type: formatted.type,
        confidence: intent.confidence,
        skipLLM: formatted.metadata?.skipLLM,
        telemetry: summary
      }
    };
  } catch (error: any) {
    console.error('[orchestratorV2] Pipeline error:', error);
    telemetry.log({
      eventType: 'error',
      stage: 'general',
      durationMs: 0,
      success: false,
      error: error.message
    });

    return {
      success: false,
      answer: 'Sorry, I encountered an error processing your request.',
      metadata: {
        intent: 'error',
        type: 'general',
        confidence: 0,
        telemetry: telemetry.getSummary()
      },
      error: error.message
    };
  }
}

/**
 * Get today's bounds in user's timezone
 */
function getTodayBounds(timezone: string): { startISO: string; endISO: string; dateLabel: string } {
  const now = new Date();

  // Create date in user's timezone
  const startOfDay = new Date(now.toLocaleDateString('en-US', { timeZone: timezone }));
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now.toLocaleDateString('en-US', { timeZone: timezone }));
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startISO: startOfDay.toISOString(),
    endISO: endOfDay.toISOString(),
    dateLabel: now.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
}
