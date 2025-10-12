/**
 * Optional Tone Shaper
 *
 * Polishes deterministic responses with user's preferred tone.
 * CRITICAL: Preserves ALL numerical values exactly.
 */

import { callChat } from '../chat';

export type ToneStyle = 'concise' | 'professional' | 'friendly' | 'encouraging' | 'off';

export interface ToneShapeOptions {
  style: ToneStyle;
  preserveNumbers: boolean; // Always true
}

/**
 * Shape tone of formatted response (optional)
 */
export async function shapeTone(
  formattedText: string,
  options: ToneShapeOptions
): Promise<string> {
  // Skip if tone is off or concise
  if (options.style === 'off' || options.style === 'concise') {
    return formattedText;
  }

  // Extract numbers to verify preservation
  const originalNumbers = extractNumbers(formattedText);

  const stylePrompts: Record<ToneStyle, string> = {
    concise: '', // Not used
    professional: 'Use professional, clear language. Be direct and informative.',
    friendly: 'Use warm, conversational language. Be supportive and approachable.',
    encouraging: 'Use motivating, positive language. Celebrate progress and encourage action.',
    off: '' // Not used
  };

  const systemPrompt = `You are a nutrition assistant tone adjuster.

**CRITICAL RULES:**
1. Preserve ALL numerical values EXACTLY as written
2. DO NOT recalculate or change any numbers
3. Only adjust wording, tone, and phrasing
4. Keep the same structure and formatting (bullets, bold, etc.)
5. If you see "680 kcal", output "680 kcal" exactly
6. Maintain markdown formatting

Style: ${stylePrompts[options.style]}

Example:
Input: "• ribeye (10oz): 680 kcal\\n  62P / 46F / 0C"
Output: "• ribeye (10oz): 680 kcal\\n  62P / 46F / 0C" (tone adjusted but numbers identical)`;

  try {
    const result = await callChat([
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: formattedText
      }
    ], {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_output_tokens: 500
    });

    if (!result.ok || !result.content) {
      console.warn('[toneShaper] LLM call failed, returning original');
      return formattedText;
    }

    const shapedText = typeof result.content === 'string'
      ? result.content
      : JSON.stringify(result.content);

    // Verify numbers preserved
    const shapedNumbers = extractNumbers(shapedText);

    if (!numbersMatch(originalNumbers, shapedNumbers)) {
      console.error('[toneShaper] Numbers changed! Returning original', {
        original: originalNumbers,
        shaped: shapedNumbers
      });
      return formattedText;
    }

    return shapedText;
  } catch (error: any) {
    console.error('[toneShaper] Error:', error);
    return formattedText;
  }
}

/**
 * Extract all numbers from text
 */
function extractNumbers(text: string): number[] {
  const numberPattern = /\b\d+(?:\.\d+)?\b/g;
  const matches = text.match(numberPattern);
  return matches ? matches.map(Number) : [];
}

/**
 * Check if two number arrays match
 */
function numbersMatch(arr1: number[], arr2: number[]): boolean {
  if (arr1.length !== arr2.length) return false;

  // Sort both arrays and compare
  const sorted1 = [...arr1].sort((a, b) => a - b);
  const sorted2 = [...arr2].sort((a, b) => a - b);

  return sorted1.every((num, idx) => Math.abs(num - sorted2[idx]) < 0.01);
}
