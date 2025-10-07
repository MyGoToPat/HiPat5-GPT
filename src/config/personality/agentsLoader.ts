/**
 * Swarm Manifest Loader
 * Loads agent configurations from JSON manifests
 * Resolves promptRef/rulesRef to actual prompts from prompts.ts
 *
 * CRITICAL: This is now the single source of truth for agent configs
 * Old agentsRegistry.ts is deprecated
 */

import personaManifest from '../swarms/persona.json';
import macroManifest from '../swarms/macro.json';
import tmwyaManifest from '../swarms/tmwya.json';
import mmbManifest from '../swarms/mmb.json';
import { PROMPTS, RULES, type PromptRef, type RulesRef } from './prompts';

export interface AgentIO {
  in: string;
  out: string;
}

export interface AgentManifestEntry {
  id: string;
  name: string;
  enabled: boolean;
  phase: 'pre' | 'core' | 'post';
  order: number;
  model: string;
  promptRef?: PromptRef;
  rulesRef?: RulesRef;
  io: AgentIO;
}

export interface LoadedAgent extends AgentManifestEntry {
  prompt?: string;
  rules?: any;
  swarm: string;
}

export type SwarmName = 'persona' | 'macro' | 'tmwya' | 'mmb';

/**
 * Load all agents from manifests
 */
export function loadAllAgents(): Record<SwarmName, LoadedAgent[]> {
  return {
    persona: loadSwarm('persona', personaManifest as AgentManifestEntry[]),
    macro: loadSwarm('macro', macroManifest as AgentManifestEntry[]),
    tmwya: loadSwarm('tmwya', tmwyaManifest as AgentManifestEntry[]),
    mmb: loadSwarm('mmb', mmbManifest as AgentManifestEntry[])
  };
}

/**
 * Load agents from a single swarm manifest
 */
function loadSwarm(swarmName: string, manifest: AgentManifestEntry[]): LoadedAgent[] {
  return manifest.map(entry => {
    const loaded: LoadedAgent = {
      ...entry,
      swarm: swarmName
    };

    // Resolve promptRef
    if (entry.promptRef) {
      loaded.prompt = PROMPTS[entry.promptRef as PromptRef];
      if (!loaded.prompt) {
        console.warn(`[agentsLoader] Missing prompt for ref: ${entry.promptRef}`);
      }
    }

    // Resolve rulesRef
    if (entry.rulesRef) {
      loaded.rules = RULES[entry.rulesRef as RulesRef];
      if (!loaded.rules) {
        console.warn(`[agentsLoader] Missing rules for ref: ${entry.rulesRef}`);
      }
    }

    return loaded;
  });
}

/**
 * Get agents for a specific swarm
 */
export function getSwarmAgents(swarmName: SwarmName): LoadedAgent[] {
  const all = loadAllAgents();
  return all[swarmName] || [];
}

/**
 * Get all enabled agents across all swarms
 */
export function getAllEnabledAgents(): LoadedAgent[] {
  const all = loadAllAgents();
  const allAgents: LoadedAgent[] = [];

  for (const swarmAgents of Object.values(all)) {
    allAgents.push(...swarmAgents.filter(a => a.enabled));
  }

  // Sort by order
  return allAgents.sort((a, b) => a.order - b.order);
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): LoadedAgent | null {
  const all = loadAllAgents();

  for (const swarmAgents of Object.values(all)) {
    const found = swarmAgents.find(a => a.id === id);
    if (found) return found;
  }

  return null;
}

/**
 * Get count stats for each swarm
 */
export function getSwarmStats(): Record<SwarmName, { total: number; enabled: number }> {
  const all = loadAllAgents();

  return {
    persona: {
      total: all.persona.length,
      enabled: all.persona.filter(a => a.enabled).length
    },
    macro: {
      total: all.macro.length,
      enabled: all.macro.filter(a => a.enabled).length
    },
    tmwya: {
      total: all.tmwya.length,
      enabled: all.tmwya.filter(a => a.enabled).length
    },
    mmb: {
      total: all.mmb.length,
      enabled: all.mmb.filter(a => a.enabled).length
    }
  };
}
