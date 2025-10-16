import type { ResponseObject } from '../../types/swarm';
import { useSwarmsStore } from '../../store/swarms';

export interface PresenterFunction {
  (response: ResponseObject): string;
}

class PresenterRegistry {
  private presenters: Map<string, PresenterFunction> = new Map();

  register(type: string, presenter: PresenterFunction): void {
    this.presenters.set(type, presenter);
  }

  get(type: string): PresenterFunction | undefined {
    return this.presenters.get(type);
  }

  has(type: string): boolean {
    return this.presenters.has(type);
  }
}

export const presenterRegistry = new PresenterRegistry();

export interface RenderOptions {
  applyPersona?: boolean;
  personaTone?: 'empathetic' | 'motivational' | 'factual' | 'casual';
  protectedFields?: string[];
  swarmId?: string;
  userId?: string;
}

export class ResponseRenderer {
  static async compose(responses: ResponseObject[], options: RenderOptions = {}): Promise<string> {
    if (options.swarmId) {
      const manifest = await useSwarmsStore.getState().getActiveManifest(options.swarmId);
      if (manifest && options.protectedFields === undefined) {
        options.protectedFields = manifest.protected_fields || [];
      }
    }

    const parts: string[] = [];
    const allIssues: ResponseObject['issues'] = [];
    const allFollowups: string[] = [];

    for (const response of responses) {
      if (options.protectedFields && options.protectedFields.length > 0) {
        const isValid = this.validateProtectedFields(response, response.payload);
        if (!isValid) {
          console.error('[renderer] Protected field validation failed');
        }
      }

      const presenter = presenterRegistry.get(response.type);
      if (!presenter) {
        console.warn(`[renderer] No presenter registered for type: ${response.type}`);
        parts.push(JSON.stringify(response.payload));
        continue;
      }

      const rendered = presenter(response);
      parts.push(rendered);

      allIssues.push(...response.issues);
      allFollowups.push(...response.followups);
    }

    let finalText = parts.join('\n\n');

    if (allIssues.length > 0) {
      const errorIssues = allIssues.filter(i => i.severity === 'error');
      const warningIssues = allIssues.filter(i => i.severity === 'warning');
      const infoIssues = allIssues.filter(i => i.severity === 'info');

      if (errorIssues.length > 0) {
        finalText += '\n\n⚠️ Issues:\n' + errorIssues.map(i => `- ${i.message}`).join('\n');
      }
      if (warningIssues.length > 0) {
        finalText += '\n\nℹ️ Notes:\n' + warningIssues.map(i => `- ${i.message}`).join('\n');
      }
      if (infoIssues.length > 0 && errorIssues.length === 0 && warningIssues.length === 0) {
        finalText += '\n\n💡 Info:\n' + infoIssues.map(i => `- ${i.message}`).join('\n');
      }
    }

    if (options.applyPersona) {
      finalText = this.applyPersonaTone(
        finalText,
        options.personaTone || responses[0]?.suggested_tone || 'casual'
      );
    }

    if (allFollowups.length > 0 && allFollowups.length <= 3) {
      finalText += '\n\n' + allFollowups.join(' ');
    }

    return finalText;
  }

  private static applyPersonaTone(text: string, tone: string): string {
    const toneMap: Record<string, { prefix?: string; suffix?: string }> = {
      empathetic: {
        prefix: '',
        suffix: '\n\nI am here if you need any clarification or want to adjust anything!'
      },
      motivational: {
        prefix: '',
        suffix: '\n\nYou are doing great—keep it up!'
      },
      factual: {
        prefix: '',
        suffix: ''
      },
      casual: {
        prefix: '',
        suffix: ''
      }
    };

    const toneStyle = toneMap[tone] || toneMap.casual;
    return `${toneStyle.prefix || ''}${text}${toneStyle.suffix || ''}`;
  }

  static validateProtectedFields(
    response: ResponseObject,
    originalPayload: Record<string, any>
  ): boolean {
    for (const field of response.protected_fields) {
      if (this.getNestedValue(response.payload, field) !== this.getNestedValue(originalPayload, field)) {
        console.error(`[renderer] Protected field "${field}" was modified!`);
        return false;
      }
    }
    return true;
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }
}

export function registerDefaultPresenters() {
  presenterRegistry.register('nutrition', nutritionPresenter);
  presenterRegistry.register('workout', workoutPresenter);
  presenterRegistry.register('general', generalPresenter);
  presenterRegistry.register('kpi', kpiPresenter);
  presenterRegistry.register('mmb', mmbPresenter);
}

function nutritionPresenter(response: ResponseObject): string {
  const { payload } = response;

  if (payload.items && payload.totals) {
    const itemLines = payload.items.map((item: any, idx: number) => {
      return `${idx + 1}. ${item.name} (${item.qty || 1} ${item.unit || 'serving'}): ${item.kcal}kcal, P:${item.protein_g}g, C:${item.carbs_g}g, F:${item.fat_g}g${item.fiber_g ? `, Fiber:${item.fiber_g}g` : ''}`;
    });

    const totals = payload.totals;
    return [
      'Here is the nutrition breakdown:',
      '',
      ...itemLines,
      '',
      `Total: ${totals.kcal}kcal | Protein: ${totals.protein_g}g | Carbs: ${totals.carbs_g}g | Fat: ${totals.fat_g}g${totals.fiber_g ? ` | Fiber: ${totals.fiber_g}g` : ''}`
    ].join('\n');
  }

  if (payload.message) {
    return payload.message;
  }

  return JSON.stringify(payload);
}

function workoutPresenter(response: ResponseObject): string {
  const { payload } = response;
  return payload.summary || payload.message || 'Workout data processed.';
}

function generalPresenter(response: ResponseObject): string {
  const { payload } = response;
  return payload.text || payload.message || JSON.stringify(payload);
}

function kpiPresenter(response: ResponseObject): string {
  const { payload } = response;

  if (payload.remaining) {
    const r = payload.remaining;
    return `Remaining today: ${r.kcal}kcal | P:${r.protein_g}g | C:${r.carbs_g}g | F:${r.fat_g}g`;
  }

  return payload.message || JSON.stringify(payload);
}

function mmbPresenter(response: ResponseObject): string {
  const { payload } = response;
  return payload.response || payload.message || 'Feedback received, thank you!';
}
