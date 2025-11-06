# ✅ Task 1 Complete: Unified Nutrition Pipeline

**Date**: 2025-10-28  
**Status**: Implementation Complete - Ready for Testing  
**Time**: ~1 hour implementation

---

## 🎯 Objective

Merge TMWYA and MACRO swarms into a single, unified nutrition pipeline to eliminate:
- Duplicate parsing logic
- Inconsistent macro outputs
- Cross-swarm state issues
- Intent routing conflicts

---

## ✅ What Was Implemented

### 1. **New Unified Pipeline** (`src/core/nutrition/unifiedPipeline.ts`)

**Purpose**: Single entry point for ALL nutrition-related queries (both info-only and logging).

**Key Features**:
- ✅ Uses existing TMWYA logic (normalizer, portionResolver, macroLookup, TEF, TDEE)
- ✅ `showLogButton` flag controls UI behavior:
  - `true` → Shows Log/Edit/Cancel buttons (for "I ate..." flows)
  - `false` → Shows Edit/Cancel only (for "what are macros..." queries)
- ✅ **Fiber included everywhere** - explicit `fiber_g: 0` if missing
- ✅ Returns existing Verification Sheet schema (no new UI component)
- ✅ Warnings for low-confidence items and unknown foods

**Code Snippet**:
```typescript
export async function processNutrition(options: NutritionPipelineOptions) {
  const { message, userId, showLogButton = true } = options;
  
  // 1. Normalizer LLM → parse food items
  // 2. portionResolver → infer quantities/units
  // 3. macroLookup → fetch macros (with fiber)
  // 4. computeTEF → calculate thermic effect
  // 5. computeTDEE → remaining calories
  // 6. Build Verification Sheet with fiber_g in every row
  
  return {
    success: true,
    roleData: {
      type: 'tmwya.verify',
      view: { rows, totals, tef, tdee, actions, warnings }
    }
  };
}
```

---

### 2. **Updated `handleUserMessage.ts`**

**Changes**:
- ✅ Replaced 157-line TMWYA block with 50-line unified pipeline call
- ✅ Handles both `food_question` AND `meal_logging` intents via same pipeline
- ✅ Passes `roleData.type` to POST agents for structured data bypass

**Before**:
```typescript
if (normalizedIntent === 'meal_logging' && intentResult.confidence >= 0.5) {
  // 157 lines of TMWYA processing
}
```

**After**:
```typescript
if ((normalizedIntent === 'meal_logging' || normalizedIntent === 'food_question') 
    && intentResult.confidence >= 0.5) {
  const { processNutrition } = await import('../nutrition/unifiedPipeline');
  const showLogButton = normalizedIntent === 'meal_logging';
  const result = await processNutrition({ message, userId, sessionId, showLogButton });
  return result;
}
```

---

### 3. **Personality POST-Agent Bypass** (`src/core/swarm/executor.ts`)

**Critical Fix**: Prevents personality polish from corrupting structured nutrition data.

**Implementation**:
```typescript
export async function executePostAgents(
  draft: string,
  swarm: SwarmConfig,
  context?: UserContext,
  mode: ExecutionMode = 'combined',
  roleDataType?: string  // ← NEW PARAMETER
): Promise<string> {
  // CRITICAL BYPASS: Do NOT polish structured nutrition data
  if (roleDataType === 'tmwya.verify') {
    console.log('[post-executor] Skipping post-polish for structured nutrition data');
    return draft;
  }
  // ... rest of post-agent logic
}
```

**Why This Matters**:
- Personality agents used to rewrite "210 cal" → "about two hundred ten calories"
- This corrupted the Verification Sheet display
- Now structured data is **protected** from personality modifications

---

### 4. **Intent Router Consolidation** (`src/core/swarm/loader.ts`)

**Changes**: All nutrition intents now route to `personality` swarm (but are handled by unified pipeline first).

**Before**:
```typescript
const intentToSwarm = {
  'food_question': 'macro',      // ← Separate swarm
  'food_log': 'tmwya',           // ← Separate swarm
  'meal_logging': 'tmwya',
};
```

**After**:
```typescript
const intentToSwarm = {
  'food_question': 'personality',    // ← Unified pipeline handles upfront
  'food_log': 'personality',         // ← Unified pipeline handles upfront
  'meal_logging': 'personality',     // ← Unified pipeline handles upfront
};
```

**Why**: The unified pipeline returns early (line 103-150 in `handleUserMessage.ts`) with `roleData`, so personality swarm only polishes any companion text (if present).

---

### 5. **MACRO Swarm Deprecated** (`src/config/swarms/macro.json`)

**Changes**:
- ✅ All agents set to `"enabled": false`
- ✅ Added deprecation notice:
```json
{
  "_comment": "⚠️ DEPRECATED: This swarm has been replaced by the Unified Nutrition Pipeline",
  "_deprecated_since": "2025-10-28",
  "_reason": "Merged with TMWYA into single nutrition pipeline for consistency."
}
```
- ✅ Macro logger marked as `"RETIRED - use TMWYA logger"`

---

### 6. **Fiber Guarantee**

**Everywhere fiber is now guaranteed**:
1. ✅ `unifiedPipeline.ts` line 156: `fiber_g: i.fiber_g ?? 0`
2. ✅ `unifiedPipeline.ts` line 162: `fiber_g: estimate.totals.fiber_g ?? 0`
3. ✅ Existing `macroLookup.ts` already returns fiber for all REF items
4. ✅ Verification Sheet schema enforces fiber in every row

---

## 🔧 Files Modified

| File | Changes | Impact |
|------|---------|--------|
| `src/core/nutrition/unifiedPipeline.ts` | **NEW** - 200 lines | Single nutrition entry point |
| `src/core/chat/handleUserMessage.ts` | Replaced 157 lines with 50 | Cleaner, unified routing |
| `src/core/swarm/executor.ts` | Added `roleDataType` bypass | Protects structured data |
| `src/core/swarm/loader.ts` | Redirected nutrition intents | No more MACRO routing |
| `src/config/swarms/macro.json` | All agents disabled | Deprecated swarm |

**Lines Removed**: ~160  
**Lines Added**: ~250  
**Net**: +90 lines (mostly documentation and error handling)

---

## 🧪 Acceptance Testing Checklist

Please test the following scenarios to verify Task 1:

### Test 1: Info-Only Query (No Log Button)
```
User: "tell me the macros of 3 whole eggs"
Expected:
✅ Verification Sheet renders
✅ Shows: 3 eggs, ~210 cal, 18.9g P, 1.2g C, 15g F, 0g fiber
✅ Buttons: Edit | Cancel (NO "Confirm log" button)
✅ Console: [nutrition] Intent: food_question, showLogButton: false
```

### Test 2: Meal Logging (With Log Button)
```
User: "i ate 3 whole eggs"
Expected:
✅ Verification Sheet renders
✅ Shows: Same macros as Test 1, fiber included
✅ Buttons: Log | Edit | Cancel
✅ Console: [nutrition] Intent: meal_logging, showLogButton: true
```

### Test 3: Fiber Included
```
User: "what are the macros for 1 cup oatmeal"
Expected:
✅ Shows: 154 cal, 6g P, 27g C, 3g F, 4g fiber
✅ Fiber visible in item row AND totals
✅ Buttons: Edit | Cancel
```

### Test 4: Personality Bypass
```
User: "i ate 2 eggs"
Expected:
✅ Verification Sheet shows clean macro numbers (not corrupted)
✅ Console: [post-executor] Skipping post-polish for structured nutrition data
✅ Numbers stay as "140 cal" (not "about one hundred forty calories")
```

### Test 5: Unknown Food Handling
```
User: "i ate aotmeel"
Expected:
✅ Warning: Unknown food "aotmeal" - please add quantity and unit
✅ Verification Sheet still renders (not blocked)
✅ 0 macros shown for unknown item
✅ Edit button allows user to fix it
```

### Test 6: MACRO Swarm Not Loaded
```
Check console during Test 1-5:
Expected:
✅ No mentions of [macro] or [MACRO] in logs
✅ All logs show [nutrition] prefix
✅ No "Using swarm: macro" messages
```

### Test 7: Chat History Persists
```
User: "what are macros of eggs"
User: (refresh page)
Expected:
✅ Previous Verification Sheet visible in history
✅ Can scroll up and see past nutrition queries
```

---

## 🚨 Known Issues / Edge Cases

### Issue 1: AMA Fallback Still Exists
**Location**: `handleUserMessage.ts` lines 207-236  
**Status**: Harmless (unreachable code)  
**Reason**: Unified pipeline returns early, so AMA fallback never executes  
**Action**: Can be removed in cleanup pass (not critical)

### Issue 2: Intent Router Patterns
**Location**: `intentRouter.ts` line 14  
**Pattern**: `/\b(what are the macros?|macros for|nutrition for)\b/i`  
**Status**: Working as intended  
**Note**: Both "what are macros" and "i ate" now use same pipeline, so pattern overlap is fine

---

## 📊 Performance Impact

### Before (Separate Swarms)
- food_question → MACRO swarm → 1 LLM call (normalizer) + macro lookup + formatting
- meal_logging → TMWYA swarm → 1 LLM call (normalizer) + macro lookup + TEF + TDEE

### After (Unified Pipeline)
- **Both** → 1 LLM call (normalizer) + macro lookup + TEF + TDEE

**Result**: Same performance, but consistent output.

### Cost Comparison
- **No change** - still 1 gpt-4o-mini call per nutrition query (~$0.0001 per request)

---

## 🔄 Rollback Plan

If Task 1 causes issues, revert these commits:

1. Delete `src/core/nutrition/unifiedPipeline.ts`
2. Restore `handleUserMessage.ts` lines 101-259 (old TMWYA block)
3. Restore `loader.ts` lines 174-194 (old intent routing)
4. Restore `executor.ts` line 28-34 (remove roleDataType parameter)
5. Re-enable MACRO swarm in `macro.json` (set `enabled: true`)

**Rollback Time**: ~5 minutes

---

## ✅ Task 1 Status: COMPLETE

**Ready for User Acceptance Testing**

All acceptance behaviors defined in user's guardrails have been implemented:
- ✅ Uses existing Verification Sheet (no new UI)
- ✅ Fiber included everywhere (explicit 0 if missing)
- ✅ Personality bypass for structured data
- ✅ Single macro source (TMWYA's macroLookup)
- ✅ Unified `next_action` (both paths show same card)
- ✅ Domain-neutral personality (skips nutrition polish)
- ✅ One logger (TMWYA's logger.ts)
- ✅ Routing simplified (both intents → unified pipeline)

**Next Steps**:
1. User tests acceptance scenarios above
2. User reports any bugs or UX issues
3. Fix any critical issues
4. **User approves Task 1 → Proceed to Task 2** (Universal Edit Feature)

---

**Estimated User Testing Time**: 15-30 minutes  
**Expected Result**: All 7 acceptance tests pass ✅

