# Pat Personality System - Usage Example

## Simple Integration

```typescript
import { getSupabase } from '../../lib/supabase';
import { loadPersonalityPrompts } from './promptLoader';
import { runPersonality } from './runPersonality';

// Load prompts once (can cache)
const supabase = getSupabase();
const blocks = await loadPersonalityPrompts(supabase, 'pat');

// Run personality for each user message
const output = await runPersonality(blocks, {
  userText: "What's the best fasting window for fat loss?",
  priorOQ: undefined,        // First turn
  priorDetail: undefined,    // First turn
  conversationHistory: [],
  dev: true                  // Enable dev logging
});

console.log('Response:', output.text);
console.log('OQ:', output.oq);
console.log('Detail Level:', output.detail);
console.log('Expertise:', output.expertise);
```

## Dev Console Output (5-turn test script)

### Turn 1: "Who are you?"
```
[pat-audience] detailLevel=simple, expertise=novice
[pat-identity] shown=true

Output: {
  text: "Hi, I'm Pat, your Hyper Intelligent Personal Assistant Team. I handle fitness, nutrition, and general problem-solving. I answer simply by default and get technical on request. Ask me one goal at a time, and say go deeper when you want the science.",
  oq: undefined,
  detail: 'simple',
  expertise: 'novice',
  identityShown: true
}
```

### Turn 2: "How do I use you?"
```
[pat-audience] detailLevel=simple, expertise=novice
[pat-identity] shown=true

Output: {
  text: "Say your goal in one sentence. I'll give the quick answer first. Say go deeper for research detail or keep it simple for steps only. For meals, say Tell Me What I Ate and name the food, brand, or barcode. For workouts, say Tell Me About My Workout. I keep your preference automatically.",
  oq: undefined,
  detail: 'simple',
  expertise: 'novice',
  identityShown: true
}
```

### Turn 3: "What's the best fasting window for fat loss?"
```
[pat-audience] detailLevel=simple, expertise=intermediate
[pat-thread] OQ='best fasting window for fat loss'
[pat-identity] shown=false

Output: {
  text: "Quick answer: [Response to question at intermediate level]. Want the deeper version?",
  oq: 'best fasting window for fat loss',
  detail: 'simple',
  expertise: 'intermediate',
  identityShown: false
}
```

### Turn 4: "Go deeper."
```
[pat-audience] detailLevel=technical, expertise=intermediate
[pat-identity] shown=false

Output: {
  text: "Quick answer: [Response]. Technical version: [Mechanism with source tags]. Practical takeaway: [Action].",
  oq: 'best fasting window for fat loss',
  detail: 'technical',
  expertise: 'intermediate',
  identityShown: false
}
```

### Turn 5: "Keep it simple."
```
[pat-audience] detailLevel=simple, expertise=intermediate
[pat-identity] shown=false

Output: {
  text: "Short plan: Step 1. Step 2. Step 3.",
  oq: 'best fasting window for fat loss',
  detail: 'simple',
  expertise: 'intermediate',
  identityShown: false
}
```

## Notes

- **Placeholder responses**: `generateCoreResponse()` returns template strings. In production, this would call an LLM with the assembled prompts.
- **Memory/Recap**: Placeholder logic. Full implementation would use LLM to detect references and generate recaps.
- **No routing**: This module does NOT decide roles, models, or routing. That's handled by the orchestrator.

