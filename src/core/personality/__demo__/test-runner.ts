/**
 * MANUAL TEST RUNNER
 * Run the 5-turn test script to verify personality behavior
 * 
 * Usage: Import this in browser console or run via Node
 */

import { runPersonality } from '../runPersonality';
import type { PromptBlock } from '../promptLoader';

// Create mock blocks with actual content from REVISED DRAFT v2
function getMockBlocks(): PromptBlock[] {
  return [
    {
      prompt_key: 'PERSONALITY_IDENTITY',
      phase: 'pre',
      order: 10,
      content: `I am Pat, your Hyper Intelligent Personal Assistant Team.

When you ask "who are you" or "introduce yourself":

Hi, I'm Pat, your Hyper Intelligent Personal Assistant Team. I handle fitness, nutrition, and general problem-solving. I answer simply by default and get technical on request. Ask me one goal at a time, and say go deeper when you want the science.

Otherwise I skip this and pass through.

Global rules for all responses:
- First person always. I am Pat.
- Short sentences. One idea per sentence.
- Grade-8 language by default. Escalate on request.
- Quick answer first. Then one optional next step or one clarifier.
- No filler words. No semicolons. No emojis. Active voice only.`
    },
    {
      prompt_key: 'PERSONALITY_HOW_TO_USE',
      phase: 'pre',
      order: 20,
      content: `When you ask how do I use you or best way to interact with you:

Say your goal in one sentence. I'll give the quick answer first. Say go deeper for research detail or keep it simple for steps only. For meals, say Tell Me What I Ate and name the food, brand, or barcode. For workouts, say Tell Me About My Workout. I keep your preference automatically.

After explaining, I ask: What's your goal right now?

Rules:
- Only respond when explicitly asked.
- Feature names are for user guidance only. I do not execute routing.
- Voice-optimized: one tip per sentence.`
    },
    {
      prompt_key: 'PERSONALITY_AUDIENCE',
      phase: 'pre',
      order: 30,
      content: `I detect your expertise level and detail preference from your language.

Expertise signals:
- Novice: plain language, asks what is, uses general terms
- Intermediate: understands basics, asks how to
- Advanced: uses jargon, asks why or edge cases
- Expert: cites sources, asks for mechanism, uses technical terms

Detail preference signals:
- Go deeper, more detail, explain the science, cite sources → DetailLevel = technical
- Keep it simple, just the steps, quick answer → DetailLevel = simple
- Default → DetailLevel = simple

I track this across the conversation.`
    },
    {
      prompt_key: 'PERSONALITY_SCOPE',
      phase: 'pre',
      order: 40,
      content: 'I do NOT choose roles or tools. The orchestrator does that.'
    },
    {
      prompt_key: 'PERSONALITY_THREAD_ANCHOR',
      phase: 'pre',
      order: 50,
      content: 'Extract OQ in ≤10 words.'
    },
    {
      prompt_key: 'PERSONALITY_CORE_RESPONDER',
      phase: 'core',
      order: 10,
      content: 'Generate quick answer. Voice-first.'
    },
    {
      prompt_key: 'PERSONALITY_DETAIL_ESCALATION',
      phase: 'core',
      order: 20,
      content: 'Handle depth escalation.'
    },
    {
      prompt_key: 'PERSONALITY_CLARIFIER',
      phase: 'core',
      order: 30,
      content: 'Ask one clarifier if needed.'
    },
    {
      prompt_key: 'PERSONALITY_MEMORY',
      phase: 'post',
      order: 10,
      content: 'Apply conversation history.'
    },
    {
      prompt_key: 'PERSONALITY_RECAP_AND_CLOSE',
      phase: 'post',
      order: 20,
      content: 'Recap using OQ.'
    },
    {
      prompt_key: 'PERSONALITY_ERROR_RECOVERY',
      phase: 'post',
      order: 30,
      content: 'Handle errors gracefully.'
    }
  ];
}

export async function run5TurnTest() {
  const blocks = getMockBlocks();

  console.log('═'.repeat(70));
  console.log('PAT PERSONALITY 5-TURN TEST');
  console.log('═'.repeat(70));

  // Turn 1
  console.log('\n📍 TURN 1: "Who are you?"');
  console.log('─'.repeat(70));
  const t1 = await runPersonality(blocks, { userText: "Who are you?", dev: true });
  console.log('Response:', t1.text);
  console.log('State:', { oq: t1.oq, detail: t1.detail, expertise: t1.expertise, identityShown: t1.identityShown });

  // Turn 2
  console.log('\n📍 TURN 2: "How do I use you?"');
  console.log('─'.repeat(70));
  const t2 = await runPersonality(blocks, { userText: "How do I use you?", dev: true });
  console.log('Response:', t2.text);
  console.log('State:', { oq: t2.oq, detail: t2.detail, expertise: t2.expertise, identityShown: t2.identityShown });

  // Turn 3
  console.log('\n📍 TURN 3: "What\'s the best fasting window for fat loss?"');
  console.log('─'.repeat(70));
  const t3 = await runPersonality(blocks, { userText: "What's the best fasting window for fat loss?", dev: true });
  console.log('Response:', t3.text);
  console.log('State:', { oq: t3.oq, detail: t3.detail, expertise: t3.expertise, identityShown: t3.identityShown });

  // Turn 4
  console.log('\n📍 TURN 4: "Go deeper."');
  console.log('─'.repeat(70));
  const t4 = await runPersonality(blocks, {
    userText: "Go deeper.",
    priorOQ: t3.oq,
    priorDetail: t3.detail,
    dev: true
  });
  console.log('Response:', t4.text);
  console.log('State:', { oq: t4.oq, detail: t4.detail, expertise: t4.expertise, identityShown: t4.identityShown });

  // Turn 5
  console.log('\n📍 TURN 5: "Keep it simple."');
  console.log('─'.repeat(70));
  const t5 = await runPersonality(blocks, {
    userText: "Keep it simple.",
    priorOQ: t4.oq,
    priorDetail: t4.detail,
    dev: true
  });
  console.log('Response:', t5.text);
  console.log('State:', { oq: t5.oq, detail: t5.detail, expertise: t5.expertise, identityShown: t5.identityShown });

  console.log('\n═'.repeat(70));
  console.log('✅ TEST COMPLETE');
  console.log('═'.repeat(70));
}

