# Quick Test Guide - Unified Nutrition Pipeline

**Before Testing:** Run `TMWYA_NORMALIZER_NAME_PRESERVATION.sql` in Supabase SQL Editor

---

## 🧪 Test 1: Food Name Preservation

**Input:** `1 cup skim milk, 2 slices sourdough bread`

**Expected Output:**
```
┌─────────────────────┬─────┬───────┬────────┬─────────┬───────┬──────┬────────┐
│ Food                │ Qty │ Unit  │ Calories│ Protein │ Carbs │ Fat  │ Fiber  │
├─────────────────────┼─────┼───────┼────────┼─────────┼───────┼──────┼────────┤
│ skim milk           │ 1   │ cup   │   83   │   8.3   │  12.0 │ 0.2  │  0     │
│ sourdough bread     │ 2   │ slice │  160   │   6.0   │  30.0 │ 2.0  │  2.0   │
└─────────────────────┴─────┴───────┴────────┴─────────┴───────┴──────┴────────┘
```

**Check:**
- ✅ Names NOT simplified ("skim milk" NOT "milk")
- ✅ Fiber column present
- ✅ Edit | Confirm log | Cancel buttons visible

---

## 🧪 Test 2: Macro Query (Info-Only)

**Input:** `what are the macros of 3 large eggs`

**Expected Output:**
```
Verification Sheet appears with:
  - Display name: "large eggs" (NOT "eggs")
  - Quantity: 3
  - Unit: piece
  - All macros + fiber (fiber_g: 0)
  - Buttons: Edit | Confirm log | Cancel
```

**Check:**
- ✅ Verification Sheet renders (NOT a text response)
- ✅ "Confirm log" button present (even for info queries)
- ✅ Food name preserved verbatim

---

## 🧪 Test 3: Meal Logging (CRITICAL)

**Input:** `I ate 10 oz ribeye`

**Action:** Click "Confirm log"

**Expected Console:**
```
[nutrition] Processing: {...}
[nutrition] Normalizer parsed items: [{"name":"ribeye","amount":10,"unit":"oz"}]
[nutrition] Pipeline complete: {...}
[nutrition] roleData.type: tmwya.verify
[SWARM] rpc/log_meal → params: {...}
[SWARM] rpc/log_meal → result: { mealLogId: "uuid-here", error: undefined }
```

**Expected UI:**
```
1. Toast: "Meal logged successfully!" ✅
2. Message changes to: "Meal logged ✅"
3. Dashboard "Today's Meals" updates
4. NO 404 errors
```

**Check:**
- ✅ No `POST .../rest/v1/rpc/log_meal_atomic 404`
- ✅ No `POST .../rest/v1/nutrition_logs 404`
- ✅ Data appears in Dashboard
- ✅ Console shows `log_meal` RPC success

---

## 🧪 Test 4: Ghost History

**Action:** Open chat history sidebar

**Expected:**
```
Chat History:
  ├─ User: "what are the macros of 3 eggs"
  └─ [Verification Sheet card]
  
  ├─ User: "I ate 10 oz ribeye"  
  └─ Assistant: "Meal logged ✅"
```

**Check:**
- ✅ No duplicate entries
- ✅ No "[nutrition] Review your meal details" ghost messages
- ✅ One entry per user turn

---

## 🧪 Test 5: Mobile Responsive

**Action:** 
1. Open Chrome DevTools
2. Set viewport to iPhone 12 (390x844)
3. Run any macro query

**Expected:**
```
- Verification Sheet table scrolls horizontally if needed
- Buttons stack appropriately
- Edit modal fits within viewport
- No horizontal overflow
- All text readable
```

**Check:**
- ✅ No layout breaks at 375px width
- ✅ Touch targets ≥ 44x44px
- ✅ Edit modal responsive

---

## 🐛 Common Issues

### Issue: Normalizer returns empty array
**Console:** `[nutrition] Normalizer parsed items: Array(0)`
**Fix:** Run `TMWYA_NORMALIZER_NAME_PRESERVATION.sql` in Supabase

### Issue: 404 on log_meal_atomic
**Console:** `POST .../rest/v1/rpc/log_meal_atomic 404`
**Fix:** Already fixed! This should NOT happen now. If it does, code reverted incorrectly.

### Issue: Names still simplified
**Example:** "milk" instead of "skim milk"
**Fix:** Database prompt not updated. Run SQL script again.

### Issue: No fiber column
**Console:** Check `estimate.items` - should have `fiber_g: 0` at minimum
**Fix:** Pipeline already sets this. Check `macroLookup` function.

---

## ✅ All Tests Pass?

If all 5 tests pass:
- Task 1 (Unified Nutrition Pipeline) is **COMPLETE** ✅
- Ready to proceed to Task 2 (Universal Edit UI) when requested
- Ready to proceed to Task 3 (Personality Refinement) when requested

**Report any failures with:**
1. Which test failed
2. Console logs
3. Screenshot (if UI issue)
4. Expected vs actual behavior

