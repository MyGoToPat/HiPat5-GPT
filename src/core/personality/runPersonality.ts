/**
 * PAT PERSONALITY RUNNER
 * Executes Pat's voice-first personality system
 * 
 * Flow: PRE → CORE → POST
 * No routing logic - personality only handles voice, tone, depth, memory
 */

import type { PromptBlock } from './promptLoader';

export type DetailLevel = 'simple' | 'technical';
export type ExpertiseLevel = 'novice' | 'intermediate' | 'advanced' | 'expert';

export interface RunInput {
  userText: string;
  priorOQ?: string;          // Original Question from previous turns
  priorDetail?: DetailLevel; // Detail level from previous turns
  conversationHistory?: Array<{ role: string; content: string }>; // Full conversation for memory
  dev?: boolean;             // Enable dev logging
}

export interface RunOutput {
  text: string;              // Final reply text
  oq?: string;               // Anchored Original Question (≤10 words)
  detail: DetailLevel;       // Chosen detail level
  expertise: ExpertiseLevel; // Detected expertise
  identityShown: boolean;    // If IDENTITY or HOW_TO_USE scripts were used
}

/**
 * Run Pat's personality system
 * @param blocks - Loaded personality prompts
 * @param input - User message and state
 * @returns Personality-processed output
 */
export async function runPersonality(
  blocks: PromptBlock[],
  input: RunInput
): Promise<RunOutput> {
  const { userText, priorOQ, priorDetail, conversationHistory = [], dev = false } = input;

  // Safety check: verify all required keys exist
  const required = [
    'PERSONALITY_IDENTITY', 'PERSONALITY_HOW_TO_USE', 'PERSONALITY_AUDIENCE', 'PERSONALITY_SCOPE',
    'PERSONALITY_THREAD_ANCHOR', 'PERSONALITY_CORE_RESPONDER', 'PERSONALITY_DETAIL_ESCALATION',
    'PERSONALITY_CLARIFIER', 'PERSONALITY_MEMORY', 'PERSONALITY_RECAP_AND_CLOSE', 'PERSONALITY_ERROR_RECOVERY'
  ];
  const missing = required.filter(k => !blocks.some(b => b.prompt_key === k));
  
  if (missing.length) {
    if (dev) {
      console.error('[pat-personality] missing=', missing);
    }
    // Fail gracefully using ERROR_RECOVERY voice pattern
    const oq = priorOQ ?? '';
    return {
      text: oq 
        ? `I may have drifted. Your original question was '${oq}'. Do you want me to continue or switch topics?`
        : 'I may have drifted. Do you want me to continue or switch topics?',
      oq: priorOQ,
      detail: priorDetail || 'simple',
      expertise: 'novice',
      identityShown: false
    };
  }

  // Initialize state
  let oq = priorOQ;
  let detail: DetailLevel = priorDetail || 'simple';
  let expertise: ExpertiseLevel = 'novice';
  let identityShown = false;
  let responseText = '';

  // === PRE-PHASE ===

  // PERSONALITY_AUDIENCE: Detect expertise and detail level
  expertise = detectExpertise(userText);
  detail = detectDetailLevel(userText, priorDetail);
  
  if (dev) {
    console.info(`[pat-audience] detailLevel=${detail}, expertise=${expertise}`);
  }

  // PERSONALITY_IDENTITY or HOW_TO_USE: Self-introduction when asked (prefer HOW_TO_USE if both match)
  const howToBlock = blocks.find(b => b.prompt_key === 'PERSONALITY_HOW_TO_USE');
  const identityBlock = blocks.find(b => b.prompt_key === 'PERSONALITY_IDENTITY');
  
  if (howToBlock && matchesHowToRequest(userText)) {
    responseText = extractCanonicalScript(howToBlock.content, 'how do I use you');
    identityShown = true;
    if (dev) {
      console.info(`[pat-identity] shown=true`);
    }
    return { text: responseText, oq, detail, expertise, identityShown };
  }
  
  if (identityBlock && matchesIntroRequest(userText)) {
    responseText = extractCanonicalScript(identityBlock.content, 'introduce yourself');
    identityShown = true;
    if (dev) {
      console.info(`[pat-identity] shown=true`);
    }
    return { text: responseText, oq, detail, expertise, identityShown };
  }

  // PERSONALITY_THREAD_ANCHOR: Capture OQ on first turn
  if (!priorOQ) {
    oq = extractOQ(userText);
    if (dev) {
      console.info(`[pat-thread] OQ='${oq}'`);
    }
  }

  // === CORE-PHASE ===

  // PERSONALITY_CORE_RESPONDER: Generate main response
  const coreBlock = blocks.find(b => b.prompt_key === 'PERSONALITY_CORE_RESPONDER');
  if (coreBlock) {
    responseText = generateCoreResponse(userText, detail, expertise, coreBlock.content);
  }

  // PERSONALITY_DETAIL_ESCALATION: Apply depth control
  const escalationBlock = blocks.find(b => b.prompt_key === 'PERSONALITY_DETAIL_ESCALATION');
  if (escalationBlock && detail === 'technical') {
    responseText = applyTechnicalEscalation(responseText);
  }

  // PERSONALITY_CLARIFIER: Add clarifier if needed
  const clarifierBlock = blocks.find(b => b.prompt_key === 'PERSONALITY_CLARIFIER');
  if (clarifierBlock && needsClarification(userText)) {
    responseText += '\n\n' + generateClarifier(userText);
  }

  // === POST-PHASE ===

  // PERSONALITY_RECAP_AND_CLOSE: Add recap if needed
  const recapBlock = blocks.find(b => b.prompt_key === 'PERSONALITY_RECAP_AND_CLOSE');
  if (recapBlock && shouldRecap(conversationHistory, oq)) {
    responseText = addRecap(responseText, oq);
  }

  // PERSONALITY_MEMORY: Apply conversation history references
  const memoryBlock = blocks.find(b => b.prompt_key === 'PERSONALITY_MEMORY');
  if (memoryBlock && conversationHistory.length > 0) {
    responseText = applyMemory(responseText, conversationHistory);
  }

  if (dev) {
    console.info(`[pat-identity] shown=${identityShown}`);
  }

  return {
    text: responseText,
    oq,
    detail,
    expertise,
    identityShown
  };
}

// ===== HELPER FUNCTIONS =====

/**
 * Detect expertise level from user's language
 */
function detectExpertise(text: string): ExpertiseLevel {
  const lower = text.toLowerCase();

  // Expert signals: cites sources, asks for mechanism, uses technical terms
  if (
    /\b(mechanism|pathway|rct|meta-analysis|systematic review|efficacy)\b/.test(lower) ||
    /\b(what about|edge case|caveat|trade-off)\b/.test(lower)
  ) {
    return 'expert';
  }

  // Advanced signals: uses jargon, asks "why"
  if (
    /\b(hypertrophy|gluconeogenesis|ketosis|anabolism|catabolism)\b/.test(lower) ||
    /\bwhy (does|is|would)\b/.test(lower)
  ) {
    return 'advanced';
  }

  // Intermediate signals: understands basics, asks "how to"
  if (/\bhow (do|to|can)\b/.test(lower)) {
    return 'intermediate';
  }

  // Default: novice
  return 'novice';
}

/**
 * Detect detail level from user's request
 */
function detectDetailLevel(text: string, prior?: DetailLevel): DetailLevel {
  const lower = text.toLowerCase();

  // Escalation triggers
  if (
    /\b(go deeper|more detail|explain the science|cite sources|show the research|what's the mechanism)\b/.test(lower)
  ) {
    return 'technical';
  }

  // De-escalation triggers
  if (
    /\b(keep it simple|too complex|just the steps|quick version|summarize)\b/.test(lower)
  ) {
    return 'simple';
  }

  // Maintain prior level or default to simple
  return prior || 'simple';
}

/**
 * Check if user is requesting introduction
 */
function matchesIntroRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(who are you|introduce yourself|what are you|tell me about yourself)\b/.test(lower);
}

/**
 * Check if user is requesting usage guide
 */
function matchesHowToRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(how (do|can) i use you|best way to (interact|use|talk)|how (should|do) i (talk|interact))\b/.test(lower);
}

/**
 * Extract canonical script from prompt content
 * Scripts are marked with the trigger phrase
 */
function extractCanonicalScript(content: string, trigger: string): string {
  // Find the script after the trigger phrase
  const lines = content.split('\n');
  let capturing = false;
  let script = '';

  for (const line of lines) {
    if (line.toLowerCase().includes(trigger)) {
      capturing = true;
      continue;
    }
    if (capturing) {
      // Stop at empty line or "Rules:" or "Otherwise"
      if (!line.trim() || line.startsWith('Rules:') || line.startsWith('Otherwise')) {
        break;
      }
      script += line.trim() + ' ';
    }
  }

  return script.trim();
}

/**
 * Extract Original Question (OQ) from user text
 * Aim for ≤10 words, action-focused
 */
function extractOQ(text: string): string {
  // Simple heuristic: take first sentence up to 10 words
  const cleaned = text.trim().replace(/[?!.]+$/, '');
  const words = cleaned.split(/\s+/).slice(0, 10);
  return words.join(' ').toLowerCase();
}

/**
 * Generate core response based on detail level
 * This is a placeholder - in production, this would call an LLM with the prompts
 */
function generateCoreResponse(
  userText: string,
  detail: DetailLevel,
  expertise: ExpertiseLevel,
  promptContent: string
): string {
  // PLACEHOLDER: In production, this assembles prompts and calls LLM
  // For now, return a template-based response
  
  if (detail === 'simple') {
    return `Quick answer: [Response to "${userText}" at ${expertise} level]. Want the deeper version?`;
  } else {
    return `Quick answer: [Response]. Technical version: [Mechanism with source tags]. Practical takeaway: [Action].`;
  }
}

/**
 * Apply technical escalation pattern
 */
function applyTechnicalEscalation(text: string): string {
  // If already in technical format, return as-is
  if (text.includes('Technical version:')) {
    return text;
  }

  // Otherwise wrap in escalation pattern
  return text + '\n\nTechnical version: [Mechanism]. Practical takeaway: [Action].';
}

/**
 * Check if user's message needs clarification
 */
function needsClarification(text: string): boolean {
  // Very simple heuristic - in production, this would use LLM analysis
  const lower = text.toLowerCase();
  
  // Ambiguous questions that could have multiple interpretations
  const ambiguousPatterns = [
    /\bbest\b.*\bprotein\b/,
    /\bbest\b.*\bsupplement\b/,
    /\bwhat (should|do) i (eat|take)\b/
  ];

  return ambiguousPatterns.some(p => p.test(lower));
}

/**
 * Generate clarifier question
 */
function generateClarifier(text: string): string {
  return 'Do you want X or Y?'; // Placeholder - LLM would generate specific clarifier
}

/**
 * Check if recap is needed based on conversation length
 */
function shouldRecap(history: Array<{ role: string; content: string }>, oq?: string): boolean {
  if (!oq) return false;
  
  // Recap if more than 3-5 turns without mentioning OQ
  const recentTurns = history.slice(-5);
  const mentionsOQ = recentTurns.some(h => h.content.toLowerCase().includes(oq.toLowerCase()));
  
  return !mentionsOQ && history.length >= 3;
}

/**
 * Add recap to response
 */
function addRecap(text: string, oq?: string): string {
  if (!oq) return text;
  return `We're still on: '${oq}'. ${text}`;
}

/**
 * Apply conversation memory references
 */
function applyMemory(text: string, history: Array<{ role: string; content: string }>): string {
  // Placeholder - in production, this would:
  // - Detect references like "it", "that", "do that"
  // - Look back in history to find referent
  // - Replace with explicit reference
  
  return text;
}

