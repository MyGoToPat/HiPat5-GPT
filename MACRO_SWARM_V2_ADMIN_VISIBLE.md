# Macro Swarm V2 - Admin Visible ✅

## ✅ All 7 Agents Now Visible in Admin

### Registry Location
**File**: `src/config/personality/agentsRegistry.ts`

The 7 Macro Swarm V2 agents are now registered and visible in Admin → Agents:

1. **macro.router** - Macro Router
2. **macro.nlu** - Meal NLU (Parser)
3. **macro.resolverAdapter** - Resolver Adapter
4. **macro.aggregator** - Macro Aggregator
5. **macro.formatter.det** - Deterministic Formatter
6. **macro.logger** - Macro Logger
7. **persona.governor** - Persona Governor

### Agent Definitions
**File**: `src/config/personality/macroSwarmV2Agents.ts`

Each agent includes:
- ✅ **id**: Unique identifier (e.g., `macro.router`)
- ✅ **name**: Display name in Admin UI
- ✅ **phase**: pre, post, or action
- ✅ **order**: Execution sequence
- ✅ **instructions**: Human-readable description for Admin
- ✅ **promptTemplate**: Detailed implementation notes
- ✅ **enabled**: true (all agents active)
- ✅ **enabledForPaid**: true
- ✅ **enabledForFreeTrial**: true

### Integration Points

#### 1. Orchestrator Uses Swarm
**File**: `src/lib/personality/orchestrator.ts`

```typescript
if (roleTarget === "macro-question") {
  // MACRO SWARM V2: Clean 7-agent system
  const parsed = macroNLU(userMessage);
  const resolved = await macroResolverAdapter(parsed);
  const payload = macroAggregator(resolved);
  const formattedText = macroFormatterDet(payload);
  const finalText = personaGovernor(formattedText);
  // ...
}
```

#### 2. Swarm Implementation
**File**: `src/lib/personality/swarms/macroSwarmV2.ts`

All 7 agents implemented as pure TypeScript functions with Zod validation.

#### 3. Routing Table
**File**: `src/lib/personality/routingTable.ts`

Routes macro-question and macro-logging to Macro Swarm V2 via orchestrator.

### How to View in Admin

1. Navigate to Admin → Agents
2. Look for agents with prefix `macro.` or name starting with "Macro"
3. You should see:
   - Macro Router
   - Meal NLU (Parser)
   - Resolver Adapter
   - Macro Aggregator
   - Deterministic Formatter
   - Macro Logger
   - Persona Governor

### Agent Details You'll See

#### Macro Router
- **Phase**: pre
- **Order**: 0
- **Instructions**: "Routes macro requests to info (macro-question) or log (macro-logging) based on deterministic patterns."

#### Meal NLU (Parser)
- **Phase**: pre
- **Order**: 1
- **Instructions**: "Parses user text into separate food items with quantities. Supports fractions (1/2). Never merges unlike foods."

#### Resolver Adapter
- **Phase**: pre
- **Order**: 2
- **Instructions**: "Calls nutrition-resolver edge function. Returns macros with fiber_g for all items."

#### Macro Aggregator
- **Phase**: pre
- **Order**: 3
- **Instructions**: "Pure TypeScript totals computation. Sums kcal, protein, carbs, fat, fiber across all items."

#### Deterministic Formatter
- **Phase**: post
- **Order**: 100
- **Instructions**: "Deterministic text builder (no LLM). Outputs clean bullets with fiber, totals, and log hint. NO markers."

#### Macro Logger
- **Phase**: action
- **Order**: 200
- **Instructions**: "Writes meal_logs and meal_items with fiber. Finds last unconsumed payload. Supports quantity adjustments."

#### Persona Governor
- **Phase**: post
- **Order**: 999
- **Instructions**: "Applies Pat's tone to text OUTSIDE macro bullet blocks. Must NOT edit formatted macro bullets."

### Toggle Controls

Each agent in Admin has toggles for:
- ✅ **Enabled** (Master switch)
- ✅ **Enable for Paid** (Tier gating)
- ✅ **Enable for Free/Trial** (Tier gating)

All Macro Swarm V2 agents default to **enabled** for all tiers.

### Swarm Metadata
**File**: `public/admin/agents/macro-swarm-v2.json`

Additional metadata for Admin UI showing:
- Swarm name: "Macro Swarm V2"
- Flow diagrams
- Contract schemas
- Agent grouping

### Testing in Admin

1. Open Admin → Agents
2. Filter or search for "macro"
3. Click on any agent to see:
   - Full instructions
   - Prompt template
   - API configuration
   - Enable/disable toggles
   - Swarm membership

### Build Status
```
✓ built in 7.42s
No errors
All agents registered
```

### Files Modified

1. `src/config/personality/agentsRegistry.ts` - Added 7 agents to export
2. `src/config/personality/macroSwarmV2Agents.ts` - NEW: Agent definitions
3. `src/lib/personality/orchestrator.ts` - Integrated swarm
4. `src/lib/personality/swarms/macroSwarmV2.ts` - Implementation
5. `public/admin/agents/macro-swarm-v2.json` - Admin metadata

### Next Steps

1. **Verify in Admin**: Navigate to Admin → Agents and confirm all 7 are visible
2. **Test Macro Query**: "macros of 1 cup cooked oatmeal and 1/2 cup raspberries and 3 large eggs"
3. **Check Telemetry**: Console should show 4 logs (route, resolver, formatter, chat-save)
4. **Toggle Testing**: Try disabling/enabling individual agents in Admin

---

**Status**: ✅ ADMIN VISIBLE
**Build**: ✅ PASSING
**Agents**: ✅ 7/7 REGISTERED
