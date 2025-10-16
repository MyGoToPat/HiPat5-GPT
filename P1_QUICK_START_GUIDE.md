# P1 Admin & Filters - Quick Start Guide

## For Dwayne (Database Verification)

### Step 1: Run the Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20251016_p1_admin_and_filters.sql`
3. Paste and execute
4. Verify: "Success. No rows returned"

### Step 2: Run Verification Queries
1. Open `VERIFICATION_QUERIES_P1.sql`
2. Copy Query 1, paste into SQL Editor, execute
3. **Screenshot the result** (should show 6 table names)
4. Repeat for Queries 2-10, screenshot each

### Step 3: Expected Results Summary
- Query 1: 6 tables created ✅
- Query 2: 6 tables with RLS enabled ✅
- Query 3: 6 RLS policies (service_role only) ✅
- Query 4: 3 dietary rules (keto, low_carb, carnivore) ✅
- Query 5: 4 new columns in user_preferences ✅
- Query 6: publish_swarm_version() works ✅
- Query 7: get_active_swarm_manifest() returns data ✅
- Query 8: 4 indexes created ✅
- Query 9: 3 triggers installed ✅
- Query 10: Summary counts correct ✅

---

## For Admin Users (Testing New Features)

### Access the Enhanced Swarms Page
1. Login as admin
2. Navigate to `/admin/swarms-enhanced`
3. You'll see the new P1 interface

### Test the System

#### 1. View Swarms
- Left panel shows all configured swarms
- Click to select and view details
- Right panel shows manifest and versions

#### 2. Create a Draft Version
1. Select a swarm
2. Click "Create Draft"
3. Edit JSON manifest
4. Click "Save Draft"
5. Verify: New version appears with "draft" badge

#### 3. Run Test Runner
1. Click "Test Runner" button
2. Enter meal description: `grilled chicken with rice and broccoli`
3. Click "Run Test"
4. Observe 4-column output:
   - **Column 1**: Raw ResponseObject (JSON)
   - **Column 2**: Filter annotations (warnings, substitutions)
   - **Column 3**: Presenter output (formatted text)
   - **Column 4**: Final render (with persona)
5. Check metrics at bottom (latency, tokens)
6. Click "Save" to persist test case

#### 4. Publish Version at 0% Rollout
1. Find draft version in versions list
2. Click "Publish @ 0%"
3. Confirm dialog
4. Verify: Status changes to "published", rollout shows 0%
5. **Important**: 0% = no user impact

#### 5. Adjust Rollout Percentage
1. Find published version
2. Move slider from 0% to desired value (e.g., 5%)
3. Click "Update"
4. Verify: Rollout percentage updated
5. **Note**: Runtime wiring not implemented yet (P4)

### Test Dietary Filters

#### Setup Test User
Run in Supabase SQL Editor:
```sql
-- Update your test user's preferences
UPDATE public.user_preferences
SET
  diet_type = 'keto',
  allergens = '["gluten", "dairy"]'::jsonb
WHERE user_id = '<your-test-user-id>';
```

#### Test Keto Filter
1. Open Test Runner
2. Enter: `spaghetti with bread and butter`
3. Run test
4. Verify Column 2 shows: "⚠️ Keto Alert: Xg carbs exceeds 20g limit"

#### Test Allergen Filter
1. Enter: `grilled cheese sandwich`
2. Run test
3. Verify Column 2 shows: "🚨 Allergen Alert: may contain gluten, dairy"

#### Test Persona Override
1. Enter same meal
2. Set `persona_override = true` (requires code modification in TestRunnerModal)
3. Run test
4. Verify Column 2 shows: No dietary annotations

---

## Troubleshooting

### "No swarms configured"
- Run migration first
- Create swarms manually:
```sql
INSERT INTO public.swarms (id, name, description, enabled)
VALUES ('nutrition.logger', 'Nutrition Logger', 'Logs and analyzes meals', true);
```

### "Service role access required"
- RLS policies restrict to service_role
- Use service role key for admin operations
- This is by design for security

### "TypeScript errors"
- Run: `npx tsc --noEmit --skipLibCheck`
- All types should compile successfully

### "Cannot access /admin/swarms-enhanced"
- Add route in App.tsx if not present
- Or use existing /admin/swarms and integrate new components

---

## Feature Flags Reference

All P1 features are gated by default:

| Feature | Flag/Control | Default | Impact |
|---------|--------------|---------|--------|
| Draft versions | DB status='draft' | N/A | No runtime impact |
| Published versions | rollout_percent | 0% | No user impact at 0% |
| Test Runner | Admin UI only | N/A | Isolated test environment |
| Dietary filters | diet_type | 'balanced' | No filtering for balanced diet |

**To enable for users:**
1. Publish version (status='published')
2. Increment rollout_percent > 0
3. **(P4)** Wire rollout % to runtime pipeline

---

## Next Actions

### Immediate (After Verification)
1. ✅ Screenshot all verification queries
2. ✅ Test Admin UI flow
3. ✅ Create draft → publish @ 0% → confirm no impact
4. ✅ Run Test Runner with various meals
5. ✅ Test dietary filter annotations

### Phase 2 (Future)
1. Implement drag-drop agent ordering by phase
2. Add diff viewer for version comparison
3. Wire rollout % to runtime pipeline
4. Add cohort gating (beta/paid/all)
5. Implement A/B testing framework

---

## Support

If you encounter issues:
1. Check `P1_IMPLEMENTATION_SUMMARY.md` for detailed architecture
2. Review `VERIFICATION_QUERIES_P1.sql` for expected database state
3. Inspect browser console for client-side errors
4. Check Supabase logs for service-role permission issues

---

**Status**: ✅ Implementation complete, ready for verification
