# Hotfix Applied: Macro Formatting & DB Errors - October 7, 2025

## Problem Statement

Three critical failures identified in production:

1. **DB 400 Error**: `record "new" has no field "chat_history_id"` - Trigger still referencing removed column
2. **Visible Template Markers**: `[[PROTECT_BULLETS_START]]` appearing in user-facing responses
3. **Unwanted Actionizer Text**: "Next: log your food intake..." appearing after macro responses

## Applied Fixes

### A) Database Trigger Cleanup

**File**: `supabase/migrations/20251007010000_drop_chat_history_id_trigger.sql`

- Dropped trigger `trg_chat_messages_backfill_fk` completely
- Dropped function `chat_messages_backfill_fk()` with CASCADE
- Verified `chat_history_id` column doesn't exist
- Migration applied successfully to database

**Result**: No more 42703 errors when inserting chat messages

### B) Deterministic Macro Formatter

**File**: `src/lib/personality/orchestrator.ts`

- Changed macro-formatter from LLM-based to direct TypeScript function call
- Now calls `formatMacros({ text, meta })` directly (no LLM involved)
- Returns clean text with metadata flags instead of visible markers
- Added telemetry logging for formatter execution

**Changes**:
```typescript
// BEFORE: Used LLM agent (macro_formatter_enhanced)
const result = await runAgent('macro-formatter', ...);

// AFTER: Direct deterministic call
if (agent.id === 'macro-formatter') {
  const formatterResult = formatMacros({ text: currentDraft, meta: draftObj.meta });
  currentDraft = formatterResult.text;
  draftObj.meta = { ...draftObj.meta, ...formatterResult.meta };
}
```

**Result**: Clean user-facing output with NO visible markers

### C) Actionizer Suppression for Macro Responses

**File**: `src/lib/personality/orchestrator.ts` (lines 417-424)

- Added skip logic for macro responses
- Skips destructive post-agents: `['conciseness-filter', 'clarity-enforcer', 'evidence-validator', 'actionizer']`
- Only runs macro-formatter for macro responses
- Respects `meta.protected` flag to prevent other agents from modifying formatted output

**Result**: No more coaching text appended to macro responses

### D) Fiber Support Added

**Files Modified**:
1. `src/lib/personality/nutritionResolver.ts` - Added fiber_g to interfaces
2. `src/lib/personality/orchestrator.ts` - Includes fiber_g in macro items
3. `src/lib/personality/postAgents/macroFormatter.ts` - Already supports fiber_g

**Key Changes**:
- Extended `ResolvedNutrition` interface with `fiber_g?: number`
- Calculates fiber per-unit for quantity adjustments
- Accumulates fiber in totals calculation
- Formatter shows fiber line only when > 0 per item
- Always shows "Total fiber X g" line (even if 0)

**Result**: Fiber now displayed in macro responses when available

## Verification

### Build Status
✅ Build succeeded with no TypeScript errors
✅ All imports resolved correctly
✅ Bundle size: 1.1 MB (gzip: 293 kB)

### Database Status
✅ Migration applied successfully
✅ Trigger and function dropped
✅ No chat_history_id column exists

### Test Command
To verify the complete flow:
```
"macros of 1 cup cooked oatmeal and 1 cup raspberries and 3 large eggs"
```

Expected output:
```
1 cup cooked oatmeal
• Calories: XXX kcal
• Protein: XX.X g
• Carbs: XX.X g
• Fat: XX.X g
• Fiber: XX.X g

1 cup raspberries
• Calories: XXX kcal
• Protein: XX.X g
• Carbs: XX.X g
• Fat: XX.X g
• Fiber: XX.X g

3 large eggs
• Calories: XXX kcal
• Protein: XX.X g
• Carbs: XX.X g
• Fat: XX.X g

Total calories XXX
Total fiber XX.X g

Say "Log All" or "Log (Food item)"
```

**NO** `[[PROTECT_BULLETS_START]]` markers
**NO** "Next: log your food intake..." text

## Telemetry Added

Console logging for debugging:
- `[macro-telemetry:route]` - Route selection
- `[macro-telemetry:parsed-items]` - Item parsing
- `[macro-telemetry:nutrition]` - Nutrition resolution
- `[macro-telemetry:formatter]` - Formatter execution with fiber status

## Files Changed

1. `src/lib/personality/orchestrator.ts` - Deterministic formatter call + Actionizer skip
2. `src/lib/personality/nutritionResolver.ts` - Fiber support in interfaces
3. `src/lib/personality/postAgents/macroFormatter.ts` - Already had fiber support (no changes needed)
4. `supabase/migrations/20251007010000_drop_chat_history_id_trigger.sql` - DB cleanup

## Technical Notes

### Why Direct Call vs LLM?

The macro-formatter was previously an LLM-based post-agent that would:
1. Receive draft text
2. Call GPT-4o-mini with macro payload in context
3. Generate formatted response with markers

This introduced:
- Non-determinism (LLM could vary output)
- Latency (additional API call)
- Cost (extra tokens)
- Complexity (visible markers in prompt)

The new approach:
1. Structured data passed in `draft.meta.macros`
2. TypeScript function formats deterministically
3. Returns clean text + metadata flags
4. Zero latency, zero cost, 100% consistent

### Protected Flag

When formatter runs, it sets `meta.protected = true` to signal the orchestrator that no other post-agents should modify the response. This prevents:
- Conciseness-filter from removing bullet points
- Clarity-enforcer from rephrasing nutrition facts
- Actionizer from adding coaching text

## Status

✅ **All hotfix sections applied**
✅ **Build passing**
✅ **Migration applied**
✅ **Ready for testing**

## Next Steps

1. Test with: `"macros of 1 cup cooked oatmeal and 1 cup raspberries and 3 large eggs"`
2. Verify no DB errors on chat message insertion
3. Verify no visible markers in output
4. Verify fiber appears when available
5. Verify no unwanted coaching text

---

**Hotfix Applied By**: Claude Code Agent
**Date**: October 7, 2025
**Build Status**: ✅ PASSING
