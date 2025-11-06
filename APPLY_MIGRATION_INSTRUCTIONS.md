# How to Apply the Food Aliases Migration 🚀

**File:** `supabase/migrations/20251029100000_add_food_aliases_and_expanded_cache.sql`

---

## ⚡ **OPTION 1: Supabase CLI (Recommended)**

```bash
# Navigate to project root
cd C:\Users\any2c\Documents\Code\HiPat5-GPT-1

# Apply migration
npx supabase db push

# Or specific migration
npx supabase migration up
```

---

## ⚡ **OPTION 2: Supabase Dashboard (Manual)**

1. Open https://supabase.com/dashboard
2. Select your project: **HiPat5-GPT-1**
3. Go to **SQL Editor**
4. Click **+ New Query**
5. Copy the entire contents of:
   ```
   supabase/migrations/20251029100000_add_food_aliases_and_expanded_cache.sql
   ```
6. Paste into SQL Editor
7. Click **Run** (bottom right)

---

## ✅ **What This Migration Does**

1. **Creates `food_aliases` table**
   - Maps "2% milk" → "milk"
   - Maps "cooked oatmeal" → "oatmeal"
   - Maps "large egg" → "egg"
   - **44 aliases total**

2. **Adds `micros` column to `food_cache`**
   - Updates all 54 existing foods with fiber values
   - 0g for proteins, 1-6g for grains/vegetables

3. **Adds 11 new food entries**
   - Sourdough bread (289 kcal/100g)
   - White bread (265 kcal/100g)
   - Wheat bread (247 kcal/100g)
   - Milk 2%, skim, whole
   - Egg variations
   - Oatmeal variations (cooked, instant)

---

## 🧪 **Verify It Worked**

**Run this query in SQL Editor:**
```sql
-- Check aliases were created
SELECT COUNT(*) as total_aliases FROM food_aliases;
-- Expected: 44

-- Check for specific aliases
SELECT alias, canonical_name FROM food_aliases 
WHERE alias IN ('2% milk', 'cooked oatmeal', 'large egg');

-- Check new foods
SELECT name, macros, micros FROM food_cache 
WHERE name IN ('sourdough bread', 'milk, 2%', 'oatmeal, cooked');

-- Check fiber was added
SELECT name, micros->>'fiber_g' as fiber 
FROM food_cache 
WHERE name = 'oatmeal';
-- Expected: fiber = 1.7
```

---

## 🎯 **Test in Pat**

1. **Refresh your browser** (localhost:5173)
2. Type: **"I ate 2% milk"**
   - Should show macros (no warnings) ✅
3. Type: **"I ate cooked oatmeal"**
   - Should show ~71 kcal/100g ✅
4. Type: **"I ate 3 large whole eggs"**
   - Should show ~429 kcal ✅
5. Type a **200-character message**
   - Input box should grow and wrap text ✅

---

## 🚨 **If Migration Fails**

**Common Issues:**

### **Error: `food_aliases` table already exists**
```sql
-- Drop and recreate
DROP TABLE IF EXISTS food_aliases CASCADE;
-- Then run migration again
```

### **Error: Unique constraint violation**
```sql
-- Clear existing aliases
DELETE FROM food_aliases;
-- Then run migration again
```

### **Error: Cannot add column `micros` (already exists)**
```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'food_cache' AND column_name = 'micros';

-- If exists, skip that part of migration
-- Just run the INSERT statements
```

---

## 📊 **Expected Results**

**Before Migration:**
```
food_cache: 54 foods
food_aliases: 0 (table doesn't exist)
Fiber in food_cache: Missing
```

**After Migration:**
```
food_cache: 65 foods
food_aliases: 44 entries
Fiber in food_cache: All foods have fiber_g ✅
```

---

## 🔄 **Rollback (If Needed)**

```sql
-- Remove everything added by this migration
DROP TABLE IF EXISTS food_aliases CASCADE;

ALTER TABLE food_cache DROP COLUMN IF EXISTS micros;

DELETE FROM food_cache 
WHERE id IN (
  'sourdough_bread:generic:100g',
  'white_bread:generic:100g',
  'wheat_bread:generic:100g',
  'milk_2percent:generic:100g',
  'milk_skim:generic:100g',
  'milk_whole:generic:100g',
  'egg_whole_large:generic:100g',
  'oatmeal_cooked:generic:100g',
  'oats_instant:generic:100g'
);
```

---

## 📝 **Next Steps After Migration**

1. ✅ Test in browser (all test cases above)
2. ⏳ Implement clarification logic (next sprint)
3. ⏳ Add conversational personality wrapper
4. ⏳ Expand to 10-15k foods (bulk import)

---

## 💬 **Need Help?**

If you encounter errors:
1. Copy the error message
2. Check the SQL Editor logs
3. Run the verification queries above
4. Share the results

**The migration is safe to run multiple times** (uses `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`)






