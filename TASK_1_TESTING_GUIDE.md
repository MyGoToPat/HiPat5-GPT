# 🧪 Task 1: Testing Guide

## Quick Start

1. **Dev Server**: Starting... (check console for "Local: http://localhost:5174")
2. **Login**: Use your existing account
3. **Navigate**: Go to Chat with Pat
4. **Test**: Run the 7 acceptance tests below

---

## 🎯 7 Acceptance Tests

### ✅ Test 1: Info Query (No Log Button)
**Input**: `tell me the macros of 3 whole eggs`

**Expected**:
- Verification Sheet appears
- Shows: ~210 cal, 18.9g P, 1.2g C, 15g F, **0g fiber**
- Buttons: **Edit | Cancel** (NO "Confirm log" button)
- Console: `[nutrition] Intent: food_question, showLogButton: false`

**Screenshot Check**: No "Confirm log" button visible

---

### ✅ Test 2: Meal Log (With Log Button)
**Input**: `i ate 3 whole eggs`

**Expected**:
- Verification Sheet appears (same macros as Test 1)
- Shows: ~210 cal, 18.9g P, 1.2g C, 15g F, **0g fiber**
- Buttons: **Log | Edit | Cancel** (all three visible)
- Console: `[nutrition] Intent: meal_logging, showLogButton: true`

**Screenshot Check**: "Confirm log" button visible

---

### ✅ Test 3: Fiber Included
**Input**: `what are the macros for 1 cup oatmeal`

**Expected**:
- Shows: 154 cal, 6g P, 27g C, 3g F, **4g fiber**
- Fiber visible in BOTH item row AND totals row
- Buttons: Edit | Cancel

**Screenshot Check**: Fiber column shows "4g" not "0g" or blank

---

### ✅ Test 4: Personality Bypass (Critical Test)
**Input**: `i ate 2 eggs`

**Expected**:
- Verification Sheet shows clean numbers: "140 cal" (not "about one forty calories")
- Console: `[post-executor] Skipping post-polish for structured nutrition data`
- No personality text corrupting the macro table

**Console Check**: Look for the skip message

---

### ✅ Test 5: Unknown Food Warning
**Input**: `i ate aotmeel`

**Expected**:
- ⚠️ Warning appears: "Unknown food 'aotmeel' - please add quantity and unit"
- Verification Sheet STILL renders (not blocked)
- Item shows: 0 cal, 0g P, 0g C, 0g F, 0g fiber
- Edit button clickable

**Screenshot Check**: Warning badge or message visible

---

### ✅ Test 6: MACRO Swarm Not Used
**During Tests 1-5, check console**:

**Expected**:
- ❌ NO `[macro]` or `[MACRO]` logs
- ✅ ONLY `[nutrition]` prefix in logs
- ❌ NO "Using swarm: macro" messages

**Console Grep**: Ctrl+F for "macro" → should only find `[nutrition]` contexts

---

### ✅ Test 7: Multiple Queries
**Input sequence**:
1. `what are macros of 3 eggs`
2. `i ate 2 slices of sourdough bread`
3. `tell me the macros for 1 cup skim milk`

**Expected**:
- All three render Verification Sheets
- Query 1: No log button
- Query 2: Has log button
- Query 3: No log button
- All show fiber values

**Screenshot Check**: Chat history shows all three cards correctly

---

## 🔍 Console Debugging

### Good Console Output Example:
```
[handleUserMessage] Intent detected: { intent: 'food_question', confidence: 0.95 }
[nutrition] Intent: food_question, showLogButton: false
[nutrition] Processing: { message: 'tell me...', userId: '...', showLogButton: false }
[nutrition] normalizer prompt source: db (or fallback)
[nutrition] Normalizer parsed items: [ { name: 'eggs', amount: 3, unit: 'piece' } ]
[nutrition] Pipeline complete: { items: 1, totals: {...}, tef: 21, tdee_remaining: 1800 }
[nutrition] roleData.type: tmwya.verify
[post-executor] Skipping post-polish for structured nutrition data (roleData.type=tmwya.verify)
```

### Bad Console Output (Indicates Failure):
```
[TMWYA] ... // ← Should say [nutrition]
[macro] ... // ← MACRO swarm should NOT appear
Using swarm: macro // ← Should be 'personality' or none
[personality-post] original=200, refined=250 // ← Should be skipped for verify
```

---

## 🐛 Common Issues

### Issue 1: "Confirm log" button shows on info queries
**Symptom**: Test 1 shows log button  
**Cause**: `showLogButton` logic inverted  
**Fix**: Check `handleUserMessage.ts` line 110

### Issue 2: Fiber shows as 0 for oatmeal
**Symptom**: Test 3 shows 0g fiber  
**Cause**: `macroLookup` not returning fiber  
**Fix**: Check `macroLookup.ts` REF table

### Issue 3: Personality corrupted macros
**Symptom**: Test 4 shows "about 140 calories"  
**Cause**: POST bypass not working  
**Fix**: Check `executor.ts` line 36 bypass logic

### Issue 4: MACRO swarm still loads
**Symptom**: Test 6 shows `[macro]` logs  
**Cause**: Intent router not updated  
**Fix**: Check `loader.ts` line 177 intent mapping

---

## ✅ Success Criteria

**All 7 tests must pass** for Task 1 to be complete.

If any test fails:
1. Take a screenshot
2. Copy console logs (last 50 lines)
3. Report: "Test X failed: [specific symptom]"
4. I'll fix immediately

**Expected Pass Rate**: 7/7 ✅

---

## 📸 Screenshot Checklist

Please provide screenshots for:
1. Test 1: Info query without log button
2. Test 2: Meal log with log button
3. Test 3: Fiber visible in macro table
4. Test 7: Chat history with multiple queries

---

## ⏱️ Estimated Testing Time

- Basic tests (1-3): **5 minutes**
- Console checks (4-6): **5 minutes**
- Multiple queries (7): **2 minutes**
- Screenshots: **3 minutes**

**Total**: ~15 minutes

---

## 🚀 Ready to Test!

Dev server should be running at: **http://localhost:5174**

If not started, run: `npm run dev`

**When all tests pass**, report back:
✅ "Task 1 tests complete - all 7 passed"

Then we'll proceed to **Task 2: Universal Edit Feature** 🎉

