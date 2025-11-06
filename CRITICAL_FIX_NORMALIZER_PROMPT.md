# 🚨 CRITICAL FIX: Normalizer Returning Empty Array

## 🔍 **Problem Identified**

Console shows:
```
[nutrition] Normalizer parsed items: Array(0)
[nutrition] Normalizer returned 0 items, falling back to naive split
```

**Result**: All macros show as 0 because:
1. Normalizer LLM returns `{items: []}`
2. Naive fallback creates item with full sentence as name
3. `macroLookup` can't find "i ate 3 eggs" in REF table
4. Returns 0 for all macros

---

## ✅ **Good News: Architecture Works!**

The unified pipeline IS functioning:
- ✅ Logs show `[nutrition]` (not `[macro]`) 
- ✅ Intent detection works (`meal_logging` vs `food_question`)
- ✅ `showLogButton` logic works
- ✅ Verification Sheet renders
- ✅ Warnings display correctly

**Only issue**: Normalizer prompt in DB (v2) is malformed.

---

## 🛠️ **The Fix**

### **Option 1: Update DB Prompt (Recommended)**

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/jdtogitfqptdrxkczdbw
2. **Click "SQL Editor"** in left sidebar
3. **Open** `TMWYA_PROMPT_FIX.sql` (created in project root)
4. **Copy/Paste** the entire SQL into the editor
5. **Click "Run"**
6. **Verify**: Should show "tmwya-normalizer v3" created

### **Option 2: Force Fallback (Quick Test)**

Edit `src/lib/admin/prompts.ts` line 64-66:

**Change**:
```typescript
if (row?.content) {
  console.info('[tmwya-prompts] using DB prompt:', agentKey, 'v'+(row.version ?? '?'));
  return row.content;
}
```

**To**:
```typescript
if (row?.content && agentKey !== 'tmwya-normalizer') { // ← Force fallback for normalizer
  console.info('[tmwya-prompts] using DB prompt:', agentKey, 'v'+(row.version ?? '?'));
  return row.content;
}
```

This makes the normalizer ALWAYS use the fallback prompt (which works).

---

## 🧪 **After Fix - Test This**

### Test 1: "i ate 3 eggs"
**Expected Console**:
```
[nutrition] Normalizer parsed items: Array(1)
[nutrition] Pipeline complete: {items: 1, totals: {calories: 210, ...}}
```

**Expected UI**:
- ✅ 3 eggs | piece | 210 cal | 18.9g P | 1.2g C | 15g F | 0g fiber
- ✅ Buttons: Log | Edit | Cancel

### Test 2: "what are the macros of 3 eggs"
**Expected Console**:
```
[nutrition] Intent: food_question, showLogButton: false
[nutrition] Normalizer parsed items: Array(1)
```

**Expected UI**:
- ✅ Same macros as Test 1
- ✅ Buttons: Edit | Cancel (NO Log button)

---

## 📊 **What The Improved Prompt Does**

### **Key Changes from v2 → v3**:

1. **Explicit "NO MARKDOWN" instruction**
   - V2: Didn't mention markdown
   - V3: "NO MARKDOWN, no ```json blocks"

2. **More examples**
   - V2: 2 examples
   - V3: 5 examples (including edge cases)

3. **Clearer unit inference rules**
   - V2: Generic list
   - V3: Explicit "eggs → piece, oatmeal → cup, bread → slice, meat → oz"

4. **Better quantity handling**
   - V2: Didn't specify what to do with missing values
   - V3: "If no quantity: amount:null, If no unit: unit:null"

5. **Name cleaning examples**
   - V3 adds: "large eggs" → "eggs", "skim milk" → "milk"

---

## 🎯 **After This Fix**

**Task 1 will be COMPLETE**:
- ✅ Unified pipeline working
- ✅ Macro swarm deprecated
- ✅ Intent routing consolidated
- ✅ Personality bypass active
- ✅ Normalizer fixed
- ✅ All acceptance tests pass

---

## ⏱️ **Time to Fix**

**Option 1** (SQL): 2 minutes (copy/paste/run)  
**Option 2** (Code): 1 minute (edit one file)

---

## 🚀 **Your Next Steps**

1. **Choose Option 1 or 2** (I recommend Option 1 - fixes it permanently)
2. **Apply the fix**
3. **Hard refresh browser** (`Ctrl+Shift+R`)
4. **Test**: "i ate 3 eggs"
5. **Check console**: Should see `Array(1)` not `Array(0)`
6. **Check UI**: Should see 210 cal, 18.9g P, etc.

---

**Ready?** Let me know which option you prefer and I'll guide you through it! 🛠️

