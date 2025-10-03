# Deployment Checklist - Cost Optimization

## Pre-Deployment

### 1. Get Gemini API Key
- [ ] Sign up at https://aistudio.google.com/app/apikey
- [ ] Create new API key for Gemini 2.0 Flash
- [ ] Note: Free tier includes 15 requests/minute, 1M requests/day
- [ ] Cost: $0.15 per 1M input tokens, $0.60 per 1M output tokens

### 2. Review Changes
- [ ] Review `COST_OPTIMIZATION_SUMMARY.md` for full implementation details
- [ ] Verify migrations in `supabase/migrations/`:
  - `20251003000000_seed_food_cache_common_foods.sql` (60 USDA foods)
  - `20251003000100_add_cache_analytics.sql` (analytics tracking)
- [ ] Build passed: ✅ (npm run build completed successfully)

## Deployment Steps

### 1. Add Environment Variable to Supabase

**Via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Edge Functions** → **Settings** → **Environment Variables**
4. Add new variable:
   - Name: `GEMINI_API_KEY`
   - Value: `<your-api-key>`
5. Click **Save**

**Via Supabase CLI (Alternative):**
```bash
supabase secrets set GEMINI_API_KEY=<your-api-key>
```

### 2. Deploy Edge Function

The tmwya-process-meal function has been updated and needs to be redeployed:

```bash
# Deploy the updated function
supabase functions deploy tmwya-process-meal
```

### 3. Apply Database Migrations

Migrations will be applied automatically on next Supabase migration sync:

```bash
# If using Supabase CLI
supabase db push

# Or via dashboard: Database → Migrations → Apply
```

**Verify migrations applied:**
```sql
-- Check food cache seeded
SELECT COUNT(*) FROM food_cache WHERE source_db = 'USDA';
-- Expected: 60 rows

-- Check analytics table exists
SELECT COUNT(*) FROM food_cache_analytics;
-- Expected: 0 rows (empty initially)
```

### 4. Verify Deployment

**Test Cache Seeded:**
```sql
SELECT * FROM food_cache
WHERE name IN ('chicken breast', 'eggs', 'rice')
LIMIT 3;
```

Expected: 3 rows with USDA data

**Test Analytics Table:**
```sql
SELECT * FROM food_cache_daily_stats;
```

Expected: Empty initially, will populate after first meals logged

## Post-Deployment Monitoring

### Hour 1: Immediate Checks

- [ ] Test meal logging: "I ate chicken breast and rice"
  - Should use cached values (logs should show "CACHE HIT")
  - Check Supabase logs for `[TMWYA Cache] HIT` messages

- [ ] Test uncached food: "I ate dragon fruit"
  - Should call Gemini API (logs show `[TMWYA Gemini] SUCCESS`)
  - Verify saved to cache after success

- [ ] Check analytics:
  ```sql
  SELECT * FROM food_cache_analytics
  ORDER BY created_at DESC
  LIMIT 10;
  ```

### Day 1: Initial Performance

- [ ] Check cache hit rate:
  ```sql
  SELECT * FROM food_cache_daily_stats WHERE date = CURRENT_DATE;
  ```
  - Expected cache_hit_rate_pct: 60-80%

- [ ] Verify Gemini is being used:
  ```sql
  SELECT
    event_type,
    COUNT(*) as count
  FROM food_cache_analytics
  WHERE date = CURRENT_DATE
  GROUP BY event_type;
  ```
  - `gemini_call` should be > 80% of `(gemini_call + gpt4o_call)`

- [ ] Review costs:
  ```sql
  SELECT
    SUM(estimated_cost_usd) as total_cost,
    COUNT(*) FILTER (WHERE event_type = 'gemini_call') as gemini_calls,
    COUNT(*) FILTER (WHERE event_type = 'gpt4o_call') as gpt4o_calls
  FROM food_cache_analytics
  WHERE date = CURRENT_DATE;
  ```

### Week 1: Performance Optimization

- [ ] Identify popular uncached foods:
  ```sql
  SELECT * FROM food_cache_seeding_candidates LIMIT 20;
  ```

- [ ] Add top candidates to seed data (create new migration)

- [ ] Monitor cache growth:
  ```sql
  SELECT
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE source_db = 'USDA') as usda_entries,
    COUNT(*) FILTER (WHERE source_db = 'gemini') as gemini_entries,
    COUNT(*) FILTER (WHERE source_db = 'gpt4o') as gpt4o_entries
  FROM food_cache;
  ```

- [ ] Weekly cost analysis:
  ```sql
  SELECT * FROM food_cache_daily_stats
  WHERE date > CURRENT_DATE - INTERVAL '7 days'
  ORDER BY date DESC;
  ```

## Troubleshooting

### Issue: High GPT-4o Usage

**Symptom:** `gpt4o_call` events > 20% of total API calls

**Diagnosis:**
```sql
SELECT food_name, COUNT(*) as gpt4o_calls
FROM food_cache_analytics
WHERE event_type = 'gpt4o_call'
  AND date > CURRENT_DATE - INTERVAL '7 days'
GROUP BY food_name
ORDER BY gpt4o_calls DESC
LIMIT 10;
```

**Solution:**
1. Check if Gemini API key is configured correctly
2. Check Gemini rate limits (15 req/min on free tier)
3. Consider upgrading to Gemini paid tier for higher limits

### Issue: Low Cache Hit Rate

**Symptom:** `cache_hit_rate_pct` < 50%

**Diagnosis:**
```sql
-- Find most commonly missed foods
SELECT food_name, COUNT(*) as misses
FROM food_cache_analytics
WHERE event_type = 'cache_miss'
  AND date > CURRENT_DATE - INTERVAL '7 days'
GROUP BY food_name
HAVING COUNT(*) >= 3
ORDER BY misses DESC
LIMIT 20;
```

**Solution:**
1. Add top missed foods to USDA seed data
2. Create migration to seed these foods
3. Cache will automatically improve over time as unique foods are logged

### Issue: Analytics Not Recording

**Symptom:** `food_cache_analytics` table is empty

**Diagnosis:**
```bash
# Check edge function logs
supabase functions logs tmwya-process-meal
```

Look for warnings: `[Analytics] Failed to log`

**Solution:**
1. Verify RLS policies on `food_cache_analytics` table
2. Ensure `log_food_cache_event` function exists:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'log_food_cache_event';
   ```
3. Test function manually:
   ```sql
   SELECT log_food_cache_event(
     'cache_hit',
     'test food',
     null,
     'test_id',
     'cache',
     10,
     0.0
   );
   ```

### Issue: Cache Entries Expiring Too Soon

**Symptom:** Frequent cache misses for previously logged foods

**Diagnosis:**
```sql
SELECT
  COUNT(*) FILTER (WHERE expires_at < now()) as expired,
  COUNT(*) FILTER (WHERE expires_at > now()) as active
FROM food_cache;
```

**Solution:**
```sql
-- Extend expiration for high-access items
UPDATE food_cache
SET expires_at = now() + INTERVAL '90 days'
WHERE access_count > 10;
```

## Rollback Procedure

If critical issues occur:

### Quick Rollback (Disable Gemini)
```bash
# Remove Gemini API key
supabase secrets unset GEMINI_API_KEY

# System automatically falls back to GPT-4o only
```

### Full Rollback (Revert to GPT-4o Only)

1. Revert edge function:
   ```bash
   git revert <commit-hash>
   supabase functions deploy tmwya-process-meal
   ```

2. Keep cache (still beneficial):
   - Cache table still works with GPT-4o
   - Analytics continue tracking

3. Drop analytics (optional):
   ```sql
   DROP TABLE food_cache_analytics CASCADE;
   ```

## Success Criteria

After 1 week, verify:

- [ ] ✅ Cache hit rate > 70%
- [ ] ✅ Gemini usage > 80% of API calls
- [ ] ✅ Average cost per meal < $0.001
- [ ] ✅ No user-reported accuracy issues
- [ ] ✅ Monthly projected savings > $100

## Support & Resources

- **Gemini API Docs:** https://ai.google.dev/docs
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **USDA FoodData Central:** https://fdc.nal.usda.gov/

## Notes

- Cache is shared across all users (massive benefit at scale)
- First user to log a food "pays" the API cost, all future users get it free
- USDA seed data eliminates 80%+ of API calls immediately
- System is self-optimizing (cache grows as users log diverse foods)
- Zero user-facing changes (optimization is transparent)

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Gemini API Key Added:** ☐ Yes ☐ No

**Migrations Applied:** ☐ Yes ☐ No

**Initial Testing Passed:** ☐ Yes ☐ No
