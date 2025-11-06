/**
 * 5-TURN TEST SCRIPT DEMO
 * Shows expected dev logs and responses for personality system
 * 
 * NOTE: This is a demonstration file showing expected behavior
 * Actual integration happens in the orchestrator
 */

import { runPersonality } from '../runPersonality';
import type { PromptBlock } from '../promptLoader';

// Mock prompt blocks (in production, these come from DB)
const mockBlocks: PromptBlock[] = [
  {
    prompt_key: 'PERSONALITY_IDENTITY',
    phase: 'pre',
    order: 10,
    content: `I am Pat, your Hyper Intelligent Personal Assistant Team.

When you ask "who are you" or "introduce yourself":

Hi, I'm Pat, your Hyper Intelligent Personal Assistant Team. I handle fitness, nutrition, and general problem-solving. I answer simply by default and get technical on request. Ask me one goal at a time, and say go deeper when you want the science.

Otherwise I skip this and pass through.`
  },
  {
    prompt_key: 'PERSONALITY_HOW_TO_USE',
    phase: 'pre',
    order: 20,
    content: `When you ask how do I use you or best way to interact with you:

Say your goal in one sentence. I'll give the quick answer first. Say go deeper for research detail or keep it simple for steps only. For meals, say Tell Me What I Ate and name the food, brand, or barcode. For workouts, say Tell Me About My Workout. I keep your preference automatically.

After explaining, I ask: What's your goal right now?`
  },
  // ... other blocks would be here
];

async function runDemo() {
  console.log('='.repeat(60));
  console.log('PAT PERSONALITY 5-TURN TEST SCRIPT');
  console.log('='.repeat(60));

  // Turn 1: "Who are you?"
  console.log('\n--- TURN 1: "Who are you?" ---');
  const turn1 = await runPersonality(mockBlocks, {
    userText: "Who are you?",
    dev: true
  });
  console.log('Response:', turn1.text);
  console.log('');

  // Turn 2: "How do I use you?"
  console.log('\n--- TURN 2: "How do I use you?" ---');
  const turn2 = await runPersonality(mockBlocks, {
    userText: "How do I use you?",
    dev: true
  });
  console.log('Response:', turn2.text);
  console.log('');

  // Turn 3: "What's the best fasting window for fat loss?"
  console.log('\n--- TURN 3: "What\'s the best fasting window for fat loss?" ---');
  const turn3 = await runPersonality(mockBlocks, {
    userText: "What's the best fasting window for fat loss?",
    dev: true
  });
  console.log('Response:', turn3.text);
  console.log('OQ captured:', turn3.oq);
  console.log('');

  // Turn 4: "Go deeper."
  console.log('\n--- TURN 4: "Go deeper." ---');
  const turn4 = await runPersonality(mockBlocks, {
    userText: "Go deeper.",
    priorOQ: turn3.oq,
    priorDetail: turn3.detail,
    dev: true
  });
  console.log('Response:', turn4.text);
  console.log('Detail level:', turn4.detail);
  console.log('');

  // Turn 5: "Keep it simple."
  console.log('\n--- TURN 5: "Keep it simple." ---');
  const turn5 = await runPersonality(mockBlocks, {
    userText: "Keep it simple.",
    priorOQ: turn4.oq,
    priorDetail: turn4.detail,
    dev: true
  });
  console.log('Response:', turn5.text);
  console.log('Detail level:', turn5.detail);
  console.log('');

  console.log('='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

// Export for testing
export { runDemo };

