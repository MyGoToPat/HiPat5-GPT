/**
 * Telemetry Event System
 *
 * Structured logging for Swarm 2.2 pipeline stages.
 * Tracks performance, LLM calls, and decision points.
 */

export type EventType =
  | 'intent_classified'
  | 'nlu_extracted'
  | 'nutrition_resolved'
  | 'macros_aggregated'
  | 'validation_run'
  | 'meal_logged'
  | 'response_formatted'
  | 'tone_shaped'
  | 'pipeline_complete'
  | 'cache_hit'
  | 'cache_miss'
  | 'error';

export type Stage =
  | 'intent'
  | 'nlu'
  | 'resolve'
  | 'aggregate'
  | 'validate'
  | 'format'
  | 'tone'
  | 'store'
  | 'cache'
  | 'general';

export type LLMProvider = 'openai' | 'anthropic' | 'gemini';

export interface TelemetryEvent {
  eventType: EventType;
  timestamp: number;
  userId: string;
  sessionId: string;

  // Stage context
  stage: Stage;

  // Performance
  durationMs: number;

  // AI calls
  llmProvider?: LLMProvider;
  llmModel?: string;
  llmTokens?: { input: number; output: number };

  // Decisions
  intent?: string;
  confidence?: number;
  itemCount?: number;
  warnings?: string[];

  // Outcomes
  success: boolean;
  error?: string;

  // Metadata
  metadata?: Record<string, any>;
}

export interface TelemetrySummary {
  totalDuration: number;
  stageCount: Record<string, number>;
  llmCalls: number;
  errors: number;
  events: TelemetryEvent[];
}

export class TelemetryCollector {
  private events: TelemetryEvent[] = [];
  private startTime: number;

  constructor(
    private userId: string,
    private sessionId: string
  ) {
    this.startTime = Date.now();
  }

  /**
   * Log a telemetry event
   */
  log(event: Omit<TelemetryEvent, 'userId' | 'sessionId' | 'timestamp'>): void {
    const fullEvent: TelemetryEvent = {
      ...event,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now()
    };

    this.events.push(fullEvent);

    // Console output for development
    if (import.meta.env.DEV) {
      console.log(`[telemetry:${event.stage}]`, {
        type: event.eventType,
        duration: `${event.durationMs}ms`,
        success: event.success,
        ...(event.llmModel && { model: event.llmModel }),
        ...(event.confidence !== undefined && { confidence: event.confidence }),
        ...(event.itemCount !== undefined && { items: event.itemCount }),
        ...(event.warnings?.length && { warnings: event.warnings }),
        ...event.metadata
      });
    }
  }

  /**
   * Get summary of all events
   */
  getSummary(): TelemetrySummary {
    const stageCount: Record<string, number> = {};

    this.events.forEach(e => {
      stageCount[e.stage] = (stageCount[e.stage] || 0) + 1;
    });

    return {
      totalDuration: Date.now() - this.startTime,
      stageCount,
      llmCalls: this.events.filter(e => e.llmProvider).length,
      errors: this.events.filter(e => !e.success).length,
      events: this.events
    };
  }

  /**
   * Get all events
   */
  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  /**
   * Get events by stage
   */
  getEventsByStage(stage: Stage): TelemetryEvent[] {
    return this.events.filter(e => e.stage === stage);
  }

  /**
   * Get total duration for a stage
   */
  getStageDuration(stage: Stage): number {
    return this.events
      .filter(e => e.stage === stage)
      .reduce((sum, e) => sum + e.durationMs, 0);
  }

  /**
   * Check if pipeline had any errors
   */
  hasErrors(): boolean {
    return this.events.some(e => !e.success);
  }

  /**
   * Get first error
   */
  getFirstError(): TelemetryEvent | null {
    return this.events.find(e => !e.success) || null;
  }
}

/**
 * Generate a session ID (simple UUID v4)
 */
export function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
