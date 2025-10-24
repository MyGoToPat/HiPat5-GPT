# Personality Swarm - Conversation Architecture

This document describes the conversation loop architecture for the Personality Swarm, which governs all general chat interactions with PAT.

## Overview

The Personality Swarm replaces the legacy DB master personality + AMA directives approach with a multi-agent system that provides:
- **Pre-phase agents**: Calibrate voice, detect audience, handle ambiguity
- **Main-phase agent**: Core response writer
- **Post-phase agents**: Polish structure, validate numbers, apply safety/memory/tool governance

## Conversation State

Each conversation maintains a dialog state object that tracks:

```typescript
interface DialogState {
  anchor: string;           // Thread goal/topic
  goal: string;             // User's current objective
  facts: string[];          // Known facts from conversation
  assumptions: string[];    // Assumptions made when clarifiers not needed
  decisions: string[];      // Decisions/recommendations given
  pending: string | null;   // Pending clarification question
  prefs: UserPreferences;   // User's known preferences
  summary: string;          // Compressed summary of conversation
  turn: number;             // Current turn number
}
```

## First User Message Flow

When a user sends their first message to PAT:

1. **Initialize**: Load system rules and saved user preferences
2. **Parse Intent**: Extract intent/goal, entities, constraints
3. **Classify Domain**: Determine if this is general chat or needs a specialized swarm (macro, tmwya, etc.)
4. **Decide Clarifier**: Only ask ONE clarifying question if wrong-answer risk is high
5. **Anchor Thread Goal**: Establish what the conversation is about
6. **Plan Response**: Structure as Answer → Action → Optional Next Step
7. **Speak in User's Style**: Match their formality (calm, short, plain language)

## Subsequent Messages Flow

For each message after the first:

```pseudocode
function on_user_msg(msg):
  // Update state
  parse = nlp_extract(msg)
  state = update_state(state, parse)

  // Sliding window + salience pinning
  // Keep important facts, compress older turns
  if state.turn % 5 == 0:
    state.summary = compress(state)

  // Clarification logic
  if must_clarify(state):
    ask_one_clarifier()
    return

  // Otherwise proceed with labeled assumption
  plan = decide_next_action(state)

  // Run through personality swarm (pre → main → post)
  out = personality_swarm(plan, state)

  // Update state
  state.summary = compress(state)
  state.turn += 1

  reply(out)
```

## Agent Execution Flow

### Pre-Phase (Calibration)
1. **Voice Calibrator**: Analyze tone (calm/friendly/direct), formality, jargon level
2. **Audience Personalizer**: Detect expertise (novice/intermediate/advanced), length preference, units
3. **Ambiguity & Assumptions**: Decide if clarifier is needed OR state explicit assumption

### Main-Phase (Response Generation)
4. **Core Responder**: Write the actual response
   - Summary first in 1-2 short paragraphs
   - ONE optional next step
   - Max one clarifier if truly blocking
   - Plain language unless user uses jargon
   - Echo critical numbers once if uncertainty > 15%
   - Avoid lists unless ≤5 bullets or user requested

### Post-Phase (Refinement)
5. **Structure & Brevity**: Polish for paragraphs over bullets, remove boilerplate
6. **Numbers & Accuracy**: Read back critical numbers for confirmation
7. **Safety & Refusal**: Block unsafe requests, offer safe alternatives
8. **Memory & Preferences**: Apply known user preferences silently
9. **Error Recovery**: Handle upstream errors gracefully
10. **Tool Governance**: Trust tool outcomes, don't recategorize

## Clarifier Policy

**Max one clarifier per turn**, and only when:
- Wrong answer risk is high (> 30%)
- User intent is genuinely ambiguous
- Missing critical information (e.g., weight for dosage calculation)

**Always proceed with a labeled assumption when:**
- Clarifier would slow down the conversation unnecessarily
- User's intent is clear enough to provide a useful answer
- Answer can be qualified with "assuming X..."

## Sliding Window & Compression

- **Sliding Window**: Keep last 10-15 messages in full context
- **Salience Pinning**: Pin critical facts (user goals, decisions, constraints) to prevent loss
- **Compression Trigger**: Every 3-5 turns, compress older context into summary
- **Compression Format**: "User wants X. Discussed Y and Z. Decided on A. Pending: B."

## Memory & Preferences

Silently apply known preferences without announcing:
- Tone preference (friendly vs. direct)
- Unit system (imperial vs. metric)
- Length preference (brief vs. standard)
- Learning style (visual, step-by-step, conceptual)

## Integration with Role Swarms

The Personality Swarm governs **voice and interaction mechanics only**. It does NOT override role swarms:

- `general` intent → **personality** swarm (this system)
- `food_question` intent → **macro** swarm (nutrition Q&A)
- `food_log` / `food_mention` / `food_undo` → **tmwya** swarm (meal logging)
- `kpi_today` / `kpi_remaining` → **macro** swarm (progress tracking)

When a role swarm executes a tool (e.g., `log_meal`), the Personality swarm's **Tool Governance** post-agent ensures:
- Tool outcomes are trusted (don't recategorize `food_log` → `food_question`)
- Success is confirmed in one short line
- Cached metadata is used for "log that" follow-up commands

## Temperature Settings

- **Pre + Main phases**: temperature = 0.55 (conversational, natural variation)
- **Post phase**: temperature = 0.4 (faithful refinement, no new facts)

## Response Template

Typical response structure:

```
[Summary in 1-2 paragraphs addressing user's question]

[Optional: ONE next step if helpful]
```

**Avoid:**
- Bullet walls (unless user requested or ≤5 items improve clarity)
- Setup phrases like "in conclusion", "to summarize"
- Robotic 16-word sentence cadence
- Announcing memory usage ("I remember you prefer...")

## Feature Flags

- `VITE_AMA_SWARM_ENABLED`: Default `true`. Set to `false` to fall back to legacy DB master path
- `VITE_PERSONALITY_POST_EXECUTOR`: Default `combined`. Options: `combined` | `sequential` | `off`

## Logging

Expected console logs for general chat:

```
[handleUserMessage] Intent: general
[swarm-loader] ✓ Loaded swarm: personality
[modelRouter] Selected: openai:gpt-4o-mini (temp=0.55)
[buildSwarmPrompt] pre=3 main=1
[personality-post] mode=combined, length=...
```

## Acceptance Criteria

1. General chat feels conversational (paragraph-first)
2. Max one clarifier, only when blocking
3. Numbers echoed once only if uncertainty is high
4. "I ate..." → logged successfully end-to-end
5. "log that" → uses cached metadata
6. No `No sessionId` console errors
7. No legacy PERSONA_* references in general path
