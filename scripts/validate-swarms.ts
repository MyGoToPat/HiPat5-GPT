#!/usr/bin/env node
/**
 * Swarm Validator - CI Check
 * Prevents agent overlap, ensures manifest integrity
 *
 * Failure conditions:
 * 1. Agent ID appears in multiple manifests
 * 2. Persona contains domain agents (macro.*, tmwya.*, mmb.*)
 * 3. Missing IO contract
 * 4. Duplicate order numbers within swarm
 * 5. Invalid phase value
 * 6. Missing promptRef or rulesRef
 */

import * as fs from 'fs';
import * as path from 'path';

interface AgentConfig {
  id: string;
  name: string;
  enabled: boolean;
  phase: string;
  order: number;
  model: string;
  promptRef?: string;
  rulesRef?: string;
  io: {
    in: string;
    out: string;
  };
}

interface ValidationError {
  type: string;
  message: string;
  swarm?: string;
  agentId?: string;
}

const errors: ValidationError[] = [];

// Load all swarm manifests
const swarmDir = path.join(process.cwd(), 'src/config/swarms');
const swarmFiles = ['persona.json', 'macro.json', 'tmwya.json', 'mmb.json'];

const swarms: Record<string, AgentConfig[]> = {};

console.log('[validate-swarms] Loading manifests...');

for (const file of swarmFiles) {
  const filePath = path.join(swarmDir, file);
  if (!fs.existsSync(filePath)) {
    errors.push({
      type: 'MISSING_MANIFEST',
      message: `Manifest file not found: ${file}`
    });
    continue;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const agents: AgentConfig[] = JSON.parse(content);
    const swarmName = file.replace('.json', '');
    swarms[swarmName] = agents;
    console.log(`  ✓ Loaded ${swarmName}: ${agents.length} agents`);
  } catch (error) {
    errors.push({
      type: 'PARSE_ERROR',
      message: `Failed to parse ${file}: ${(error as Error).message}`
    });
  }
}

// Validation 1: Check for duplicate agent IDs across swarms
console.log('\n[validate-swarms] Checking for duplicate agent IDs...');
const agentIdToSwarm = new Map<string, string[]>();

for (const [swarmName, agents] of Object.entries(swarms)) {
  for (const agent of agents) {
    if (!agentIdToSwarm.has(agent.id)) {
      agentIdToSwarm.set(agent.id, []);
    }
    agentIdToSwarm.get(agent.id)!.push(swarmName);
  }
}

for (const [agentId, swarmList] of agentIdToSwarm.entries()) {
  if (swarmList.length > 1) {
    errors.push({
      type: 'DUPLICATE_AGENT_ID',
      message: `Agent ID "${agentId}" appears in multiple swarms: ${swarmList.join(', ')}`,
      agentId
    });
  }
}

// Validation 2: Persona must NOT contain domain agents
console.log('[validate-swarms] Checking Persona for domain agents...');
if (swarms.persona) {
  for (const agent of swarms.persona) {
    if (agent.id.startsWith('macro.') || agent.id.startsWith('tmwya.') || agent.id.startsWith('mmb.')) {
      errors.push({
        type: 'PERSONA_DOMAIN_AGENT',
        message: `Persona contains domain agent: ${agent.id} (must be pure polish/tone)`,
        swarm: 'persona',
        agentId: agent.id
      });
    }
  }
}

// Validation 3: All agents must have IO contract
console.log('[validate-swarms] Checking IO contracts...');
for (const [swarmName, agents] of Object.entries(swarms)) {
  for (const agent of agents) {
    if (!agent.io || !agent.io.in || !agent.io.out) {
      errors.push({
        type: 'MISSING_IO',
        message: `Agent "${agent.id}" missing IO contract`,
        swarm: swarmName,
        agentId: agent.id
      });
    }
  }
}

// Validation 4: No duplicate order numbers within swarm
console.log('[validate-swarms] Checking for duplicate orders...');
for (const [swarmName, agents] of Object.entries(swarms)) {
  const orders = new Map<number, string[]>();
  for (const agent of agents) {
    if (!orders.has(agent.order)) {
      orders.set(agent.order, []);
    }
    orders.get(agent.order)!.push(agent.id);
  }

  for (const [order, agentIds] of orders.entries()) {
    if (agentIds.length > 1) {
      errors.push({
        type: 'DUPLICATE_ORDER',
        message: `Swarm "${swarmName}" has duplicate order ${order}: ${agentIds.join(', ')}`,
        swarm: swarmName
      });
    }
  }
}

// Validation 5: Valid phase values
console.log('[validate-swarms] Checking phase values...');
const validPhases = ['pre', 'core', 'post'];
for (const [swarmName, agents] of Object.entries(swarms)) {
  for (const agent of agents) {
    if (!validPhases.includes(agent.phase)) {
      errors.push({
        type: 'INVALID_PHASE',
        message: `Agent "${agent.id}" has invalid phase: "${agent.phase}" (must be pre|core|post)`,
        swarm: swarmName,
        agentId: agent.id
      });
    }
  }
}

// Validation 6: All agents must have promptRef or rulesRef
console.log('[validate-swarms] Checking prompt/rule references...');
for (const [swarmName, agents] of Object.entries(swarms)) {
  for (const agent of agents) {
    if (!agent.promptRef && !agent.rulesRef) {
      errors.push({
        type: 'MISSING_REF',
        message: `Agent "${agent.id}" missing promptRef or rulesRef`,
        swarm: swarmName,
        agentId: agent.id
      });
    }
  }
}

// Report results
console.log('\n' + '='.repeat(70));
if (errors.length === 0) {
  console.log('✓ All validations passed!');
  console.log('='.repeat(70));
  process.exit(0);
} else {
  console.log(`✗ ${errors.length} validation error(s) found:`);
  console.log('='.repeat(70));

  for (const error of errors) {
    console.log(`\n[${error.type}]`);
    console.log(`  ${error.message}`);
    if (error.swarm) console.log(`  Swarm: ${error.swarm}`);
    if (error.agentId) console.log(`  Agent: ${error.agentId}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('Fix these errors before merging to main.');
  console.log('='.repeat(70) + '\n');
  process.exit(1);
}
