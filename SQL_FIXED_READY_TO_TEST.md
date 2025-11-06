# ✅ SQL FIXED - Ready to Test

**Status:** All 4 fixes complete + SQL corrected  
**Time:** Ready now  
**Dev Server:** Running on http://localhost:5173

---

## ✅ SQL File Corrected

**File:** `TMWYA_NORMALIZER_NAME_PRESERVATION.sql`

**Fixed Issues:**
- ❌ Old: Used `E'...'` syntax with `auth.uid()` (syntax error)
- ✅ New: Uses `$content$...$content$` dollar-quoting (PostgreSQL best practice)
- ✅ New: Safe upsert pattern with `WITH ... UNION ALL`
- ✅ New: Auto-increments version OR creates v1 if none exists
- ✅ New: No hardcoded `created_by` (removes auth.uid() issue)

**What the SQL does:**
1. Checks if `tmwya-normalizer` prompt exists
2. If exists: Creates new version (current + 1) with preserved metadata
3. If not exists: Creates v1 with default values
4. Sets status to `'published'` immediately
5. Verifies by showing last 5 versions

---

## 🚀 Testing Steps

### Step 1: Run SQL
```
1. Open Supabase Dashboard → SQL Editor
2. Paste contents of TMWYA_NORMALIZER_NAME_PRESERVATION.sql
3. Click "Run"
4. Check results - should show version incremented
```

### Step 2: Test in App
```
Go to: http://localhost:5173
Test: "1 cup skim milk, 2 slices sourdough bread"
Expect: Names preserved ("skim milk" NOT "milk")
```

### Step 3: Test Logging
```
Input: "I ate 3 large eggs"
Click: "Confirm log"
Expect: 
  ✅ Toast: "Meal logged successfully!"
  ✅ No 404 errors
  ✅ Dashboard updates
```

### Step 4: Check History
```
Open: Chat history sidebar
Expect: No ghost/duplicate entries
```

---

## 📊 Expected Console Output (Success)

```javascript
[nutrition] Processing: {message: "1 cup skim milk, 2 slices sourdough bread", ...}
[nutrition] normalizer prompt source: db
[nutrition] Normalizer parsed items: [
  {name: "skim milk", amount: 1, unit: "cup"},
  {name: "sourdough bread", amount: 2, unit: "slice"}
]
[nutrition] Pipeline complete: {items: 2, totals: {...}, tef: 24.3, tdee_remaining: 1876}
[nutrition] roleData.type: tmwya.verify

// On clicking "Confirm log":
[SWARM] rpc/log_meal → params: {p_meal_slot_text: null, items_count: 2, totals_kcal: 243}
[SWARM] rpc/log_meal → result: {mealLogId: "uuid-here", error: undefined}
```

---

## ❌ If You See These Errors (SQL Not Run)

```javascript
[nutrition] normalizer prompt source: fallback
// ^ Means database prompt not updated yet

[nutrition] Normalizer parsed items: [
  {name: "milk", amount: 1, unit: "cup"},  // ❌ Simplified!
  {name: "bread", amount: 2, unit: "slice"} // ❌ Simplified!
]
```

**Solution:** Run the SQL file!

---

## ❌ If You See These Errors (Logging)

```javascript
POST http://localhost:5173/rest/v1/rpc/log_meal_atomic 404 (Not Found)
POST http://localhost:5173/rest/v1/nutrition_logs 404 (Not Found)
```

**This should NOT happen anymore!** If it does:
1. Check that changes to `ChatPat.tsx` were applied
2. Verify `saveMealAction` import is present
3. Check `onConfirm` handler uses `saveMealAction` (not `logMeal`)

---

## 🎯 Quick Verification Checklist

| Check | Expected | Pass? |
|-------|----------|-------|
| SQL runs without error | Version increments | ⬜ |
| Food names preserved | "skim milk" NOT "milk" | ⬜ |
| Verify sheet shows | Both macro queries & "I ate" | ⬜ |
| Logging works | No 404s, toast success | ⬜ |
| Dashboard updates | Meal appears in "Today's Meals" | ⬜ |
| No ghost history | One entry per user turn | ⬜ |
| Fiber present | Column shows (even if 0) | ⬜ |
| Mobile responsive | Works at 375px width | ⬜ |

---

## 📝 Files Changed Summary

```
src/core/nutrition/unifiedPipeline.ts       ← Fallback prompt updated
src/components/ChatPat.tsx                   ← Logging path fixed
src/core/chat/handleUserMessage.ts          ← Ghost history removed
TMWYA_NORMALIZER_NAME_PRESERVATION.sql      ← SQL CORRECTED ✅
```

---

## 🎉 What Success Looks Like

**User Input:** "1 cup skim milk, 2 slices sourdough bread"

**Verification Sheet:**
| Food | Qty | Unit | Cal | Pro | Carbs | Fat | Fiber |
|------|-----|------|-----|-----|-------|-----|-------|
| skim milk | 1 | cup | 83 | 8.3 | 12.0 | 0.2 | 0 |
| sourdough bread | 2 | slice | 160 | 6.0 | 30.0 | 2.0 | 2.0 |
| **Totals** | | | **243** | **14.3** | **42.0** | **2.2** | **2.0** |

**Buttons:** [Cancel] [Edit] [Confirm log]

**After "Confirm log":**
- ✅ Green toast: "Meal logged successfully!"
- ✅ Message becomes: "Meal logged ✅"
- ✅ Dashboard shows 243 kcal added to today's totals
- ✅ Console: `log_meal → result: {mealLogId: "..."}`

---

## 📞 Support

If any test fails, report with:
1. Which test (#1-5)
2. Console output (full `[nutrition]` and `[SWARM]` logs)
3. Screenshot of UI
4. SQL verification query result

**Ready to test! 🚀**

