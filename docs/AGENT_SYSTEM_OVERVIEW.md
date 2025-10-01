# Pat's Agent System Overview

This document explains how Pat's personality system works and how to control it.

## Architecture

Pat's personality is built from **11 modular agents** that work together to create intelligent, context-aware responses.

### Core System Agents (Order 0-2)

1. **Master Prompt (Order 0)** - Pat's base personality
   - Contains core identity, expertise, communication style
   - Defines forbidden words and output format
   - Editable through Admin UI

2. **Context Checker (Order 1)** - Detects missing user setup
   - Checks for TDEE completion
   - Detects first-time users
   - Generates contextual reminders

3. **Role Detector (Order 2)** - Pattern matching for specialized modes
   - Detects TMWYA (food logging) triggers
   - Detects MMB (support/feedback) triggers
   - Detects Fitness Coach triggers
   - Detects Nutrition Planner triggers

### Specialized Expert Agents (Order 10-13)

4. **TMWYA Expert (Order 10)** - Food logging specialist
   - Parses food descriptions
   - Calculates macros
   - Provides nutritional insights

5. **MMB Expert (Order 11)** - Product support specialist
   - Categorizes feedback (bug, feature request, etc.)
   - Provides solutions or workarounds
   - Escalates to development team

6. **Fitness Coach (Order 12)** - Training specialist
   - Evidence-based programming advice
   - Sets/reps/frequency recommendations
   - Progression strategies

7. **Nutrition Planner (Order 13)** - Meal planning specialist
   - Macro target calculations
   - Meal timing strategies
   - Practical food examples

### Response Enhancer Agents (Order 20-23)

8. **Evidence Validator (Order 20)** - Adds research citations
   - Verifies all scientific claims have evidence tags
   - Adds [RCT], [meta-analysis], [guideline] tags

9. **Clarity Enforcer (Order 21)** - Simplifies complex language
   - Removes jargon or explains it
   - Breaks complex sentences into clear steps
   - Uses active voice

10. **Conciseness Filter (Order 22)** - Removes fluff words
    - Strips forbidden words
    - Removes setup phrases
    - Keeps responses within target word count

11. **Actionizer (Order 23)** - Adds clear next steps
    - Ensures every response has 1-2 action items
    - Makes actions specific and measurable

## How to Control Agents

### Admin UI Access

1. Navigate to **Admin > Agents**
2. Select **"Pat's Personality"** from the swarm tabs
3. You'll see all 11 agents listed

### What You Can Control

For each agent, you can:

- **Enable/Disable**: Turn agents on or off
- **Edit Instructions**: Modify the agent's system prompt
- **Edit Prompt Template**: Change how user messages are formatted
- **Adjust Settings**: Change model, temperature, max tokens
- **Reorder**: Change execution order (order field)

### Examples of Control

**Disable Evidence Validator** → Pat stops adding research citations
**Disable Conciseness Filter** → Pat provides longer, more detailed responses
**Disable Context Checker** → Pat stops reminding users about TDEE
**Edit Master Prompt** → Change Pat's entire personality and tone

## Version Management

The agent system uses versioning to ensure everyone gets updates:

- Current version: **4** (defined in `personalityStore.ts`)
- When version increases, all users' localStorage resets to new defaults
- Users can still customize agents after reset

## File Locations

- **Agent Registry**: `src/config/personality/agentsRegistry.ts`
- **State Management**: `src/state/personalityStore.ts`
- **Admin UI**: `src/pages/admin/AgentsListPage.tsx`
- **Orchestrator**: `src/lib/personality/orchestrator.ts`

## Testing Changes

1. Edit agent in Admin UI
2. Save changes (automatically persists to localStorage)
3. Test in Chat interface
4. Use browser console to see agent execution logs

## Rollback

If you need to restore original agents:

1. Go to Admin > Agents
2. Click "Restore Pat's Personality Defaults" button
3. Or manually delete `hipat.personality.v1` from localStorage

## Future Enhancements

- Move agents to Supabase database for server-side control
- Add A/B testing for different agent configurations
- Add analytics showing which agents fire most often
- Add cost tracking per agent
- Add agent execution time metrics
