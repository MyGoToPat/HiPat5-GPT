/**
 * TALK MODE RULES
 * Client-side helpers for Talk with Pat
 */

import { PAT_TALK_RULES } from './patSystem';

export interface SpeechChunk {
  text: string;
  pauseAfterMs: number;
  isLast: boolean;
}

/**
 * Split response into 1-2 sentence chunks for natural speech delivery
 */
export function chunkForSpeech(text: string): SpeechChunk[] {
  // Split on sentence boundaries
  const sentences = text.split(/([.!?]\s+)/).filter(s => s.trim().length > 0);

  const chunks: SpeechChunk[] = [];
  let currentChunk = '';
  let sentenceCount = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];

    // Skip standalone punctuation
    if (sentence.match(/^[.!?]\s*$/)) {
      currentChunk += sentence;
      continue;
    }

    currentChunk += sentence;
    sentenceCount++;

    // Chunk after 1-2 sentences
    if (sentenceCount >= PAT_TALK_RULES.maxChunkSentences || i === sentences.length - 1) {
      const pauseMs = getRandomPause();

      chunks.push({
        text: currentChunk.trim(),
        pauseAfterMs: pauseMs,
        isLast: i === sentences.length - 1,
      });

      currentChunk = '';
      sentenceCount = 0;
    }
  }

  // Handle edge case where no chunks were created
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push({
      text: text.trim(),
      pauseAfterMs: 0,
      isLast: true,
    });
  }

  return chunks;
}

/**
 * Get random pause duration within configured range
 */
function getRandomPause(): number {
  const [min, max] = PAT_TALK_RULES.pauseDurationMs;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Remove filler words for cleaner speech
 */
export function removeFiller(text: string): string {
  if (!PAT_TALK_RULES.suppressFiller) {
    return text;
  }

  const fillerPatterns = [
    /\bum+\b/gi,
    /\buh+\b/gi,
    /\blike,?\b/gi,
    /\byou know,?\b/gi,
    /\bI mean,?\b/gi,
    /\bsort of\b/gi,
    /\bkind of\b/gi,
  ];

  let cleaned = text;
  for (const pattern of fillerPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Clean up extra spaces
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return cleaned;
}

/**
 * Check if response is suitable for speech or should switch to text
 */
export function shouldSwitchToText(text: string): boolean {
  // Switch to text if response contains structured data
  const structuredPatterns = [
    /•/g, // Bullet points
    /^\d+\.\s/m, // Numbered lists
    /\n{2,}/g, // Multiple line breaks (tables, etc.)
    /<[^>]+>/g, // HTML/XML tags
  ];

  for (const pattern of structuredPatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }

  // Switch to text if response is very long
  if (text.length > 800) {
    return true;
  }

  return false;
}

/**
 * Format structured numeric output for speech readability
 */
export function formatForSpeech(text: string): string {
  let formatted = text;

  // Convert numbers with commas/spaces to spoken format
  // Example: "1,450 kcal" → "1450 kcal" (TTS handles this better)
  formatted = formatted.replace(/(\d+),(\d+)/g, '$1$2');
  formatted = formatted.replace(/(\d+)\s(\d+)/g, '$1$2');

  // Remove bullet points (already handled by shouldSwitchToText, but just in case)
  formatted = formatted.replace(/^•\s*/gm, '');

  return formatted;
}

/**
 * Barge-in handler (client-side implementation)
 * Called when user starts speaking during Pat's response
 */
export interface BargeInHandler {
  onBargeIn: () => void;
}

export function createBargeInHandler(onInterrupt: () => void): BargeInHandler {
  return {
    onBargeIn: () => {
      if (PAT_TALK_RULES.bargeInEnabled) {
        console.log('[Talk] Barge-in detected - stopping speech');
        onInterrupt();
      }
    },
  };
}
