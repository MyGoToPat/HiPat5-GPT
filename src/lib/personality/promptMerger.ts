/**
 * PERSONALITY PROMPT MERGER
 * Merges master personality with swarm-specific directives
 * Ensures all swarms inherit Pat's base voice and tone
 */

/**
 * Prepends the master personality to swarm-specific prompts
 * This ensures consistent voice across all specialized agents
 *
 * @param master - The master personality prompt from the database
 * @param swarmDirectives - Swarm-specific instructions (TMWYA, Macro, etc.)
 * @returns Combined prompt with master personality first, swarm rules second
 */
export function withMaster(master: string, swarmDirectives: string): string {
  if (!master || master.trim().length === 0) {
    console.warn('[promptMerger] Master personality is empty, using swarm directives only');
    return swarmDirectives;
  }

  if (!swarmDirectives || swarmDirectives.trim().length === 0) {
    console.warn('[promptMerger] Swarm directives are empty, using master personality only');
    return master;
  }

  // Combine: master personality first, then swarm-specific rules
  return `${master.trim()}

---

# Swarm-Specific Directives

${swarmDirectives.trim()}`;
}

/**
 * Logs the combined prompt length for debugging
 * Use this to verify prompts are being merged correctly
 */
export function logMergedPromptInfo(combined: string, swarmName: string): void {
  console.log(`[promptMerger] ${swarmName} prompt length: ${combined.length} chars`);
}
