# Legacy Swarm System Archive

**Archive Date:** 2025-01-11 14:30 UTC
**Reason:** Pat rebuild - transitioning to single P3 master personality

## Contents

This archive contains the complete legacy swarm-based personality system that has been replaced by a unified P3 master personality prompt.

### Archived Components

**src/agents/persona/** - Personality swarm agents
- orchestrator.ts - Main swarm orchestrator
- swarm.ts - Swarm coordination logic
- modules/ - 12 individual agent modules (empathy-detector, learning-profiler, etc.)

**src/config/personality/** - Agent configuration
- agentsLoader.ts - Dynamic agent loading
- agentsRegistry.ts - Agent registry
- macroAgents.ts - Macro-specific agents

**src/lib/personality/** - Personality logic
- orchestrator.ts, orchestrator.v2.ts - Legacy orchestrators
- roleDetector.ts, rolePrompts.ts - Role-based routing
- intentClassifier.ts, intentClassifier.v2.ts - Intent classification
- dataFormatter.ts, macroValidator.ts, nutritionResolver.ts - Data processing
- permissions.ts, routingTable.ts, toneShaper.ts - Supporting logic
- swarms/macroSwarmV2.ts - Macro-specific swarm
- postAgents/macroFormatter.ts - Post-processing formatters

**src/lib/swarms/** - Role-specific swarms
- food/ - 10 food-related swarm agents
- kpi/ - KPI swarm agents

**src/state/** - State management
- personalityStore.ts - Personality state store

**supabase/functions/** - Edge function implementations
- _shared/persona/ - Shared persona logic
- intelligent-chat/ - Legacy intelligent chat function
- openai-food-macros/ - Legacy macro calculation function
- tmwya-process-meal/ - Legacy meal processing function

## Replacement System

The new system consists of:
- **src/core/personality/patSystem.ts** - Single P3 master prompt
- **src/core/router/intentRouter.ts** - Lightweight intent detection
- **src/core/router/modelRouter.ts** - Cost-aware model selection
- **src/core/chat/handleUserMessage.ts** - Unified message handler
- **src/domains/food/*** - Domain-specific logic (TMWYA)

## Restoration

If needed, restore files with:
```bash
cp -r _legacy/Swarm_Archive/20250111-1430/* ./
```

## Notes

- Files kept in place: contextChecker.ts, template.ts, retry.ts, tools.ts
- Edge functions kept: nutrition-resolver/, openai-chat/
- This archive preserves the complete legacy system for reference
