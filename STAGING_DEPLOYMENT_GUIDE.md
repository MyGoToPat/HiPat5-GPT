# Phase D Staging Deployment Guide

## Deployment Status

✅ **Code Implementation**: Complete
✅ **Build Verification**: Passed (0 TypeScript errors)
⏳ **Staging Deployment**: Ready for execution

## Automated Deployment Script

A comprehensive deployment script has been created at:
```
scripts/deploy-staging-phase-d.sh
```

### Prerequisites

1. **Environment Variables** - Set these before running the script:
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export SUPABASE_ANON_KEY="your-anon-key"
   export SUPABASE_PROJECT_REF="your-project-ref"
   export OPENAI_API_KEY="your-openai-key"
   export VITE_PHASE_D_WRITE_ENABLED=true
   ```

2. **Tools Required**:
   - Node.js and npm
   - Supabase CLI (`npm install -g supabase`)
   - Firebase CLI (`npm install -g firebase-tools`)
   - Bash shell

### Running the Deployment

```bash
# Make script executable
chmod +x scripts/deploy-staging-phase-d.sh

# Run the deployment
./scripts/deploy-staging-phase-d.sh
```

## Manual Deployment Steps

If you prefer manual execution, follow these steps:

### Step 1: Deploy Edge Functions

```bash
# Deploy openai-chat
npx supabase functions deploy openai-chat --project-ref YOUR_PROJECT_REF

# Deploy swarm-admin-api
npx supabase functions deploy swarm-admin-api --project-ref YOUR_PROJECT_REF
```

### Step 2: Run SQL Migration

The audit table migration is at:
```
supabase/migrations/20251019000000_create_admin_action_logs.sql
```

Apply it via:
```bash
npx supabase db push --project-ref YOUR_PROJECT_REF
```

Or run the SQL directly in Supabase dashboard:
```sql
-- See migration file for complete SQL
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_table text,
  target_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

### Step 3: Build and Deploy Web App

```bash
# Set environment variables
export VITE_PHASE_D_WRITE_ENABLED=true
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export VITE_SUPABASE_ANON_KEY="your-anon-key"

# Build
npm run build

# Deploy to Firebase staging
firebase deploy --only hosting:staging
```

### Step 4: Verification Tests

#### Phase B - Telemetry Verification

Open staging URL in browser with DevTools Console:

**Expected Console Logs:**
```
[SwarmsPageEnhanced] promptsShape detected: <id|key|unknown>
[SwarmsPageEnhanced] Environment gate WRITE_ENABLED=true
[mapPromptToWrite] Using <id|key> shape for payload
[verifyPromptIntegrity] Validation passed
```

**Network Tab Checks:**
- POST to `/rest/v1/swarm_prompts` or `/rest/v1/swarm_agent_prompts`
- Response contains inserted row with correct schema fields
- No 400/500 errors

#### Phase D - Write Operation Tests

**Test 1: Create New Prompt (ID-shape schema)**
1. Navigate to `/admin/swarms-enhanced`
2. Select "Prompts" tab
3. Select agent from dropdown
4. Enter prompt text
5. Click "Add Prompt"

✓ Success toast appears
✓ New row appears in table
✓ Console: `[mapPromptToWrite] Using id shape`
✓ Network POST contains `{agent_id, content}`

**Test 2: Create New Prompt (KEY-shape schema)**
- Same steps as Test 1
- Verify console shows `key` shape
- Verify POST contains `{agent_key, prompt}`

**Test 3: Edit Existing Prompt**
1. Click Edit icon on existing prompt
2. Modify text in modal
3. Click Save

✓ Success toast appears
✓ Table updates with new text
✓ Console shows validation passed

**Test 4: Rollout Controls**
1. Select "Rollout" tab
2. Change agent version in dropdown
3. Click "Update Rollout"

✓ Success toast appears
✓ Console shows `[updateRollout] mutation`

**Test 5: JSON Manifest Editing**
1. Select "Manifest" tab
2. Edit JSON in textarea
3. Click "Save Manifest"

✓ Valid JSON accepted with success toast
✓ Invalid JSON rejected with error toast

**Test 6: Access Control**
1. Logout from admin account
2. Login as non-admin user
3. Navigate to `/admin/swarms-enhanced`

✓ Redirected or "Access Denied" message shown

**Test 7: Audit Logging**
1. Perform any write operation (create/edit prompt)
2. Query `admin_action_logs` table in Supabase

✓ New row created with correct metadata
✓ `admin_user_id` matches logged-in user
✓ `action`, `target_table`, `metadata` populated correctly

### Step 5: Collect Verification Evidence

Create a verification report with:
- Screenshots of console logs
- Network trace exports
- Database query results
- Test results for all 7 scenarios

Use the checklist generated in:
```
staging-verification-[timestamp]/VERIFICATION_CHECKLIST.md
```

## Rollback Plan

If issues are discovered:

1. **Disable writes immediately**:
   ```bash
   # Redeploy with writes disabled
   export VITE_PHASE_D_WRITE_ENABLED=false
   npm run build
   firebase deploy --only hosting:staging
   ```

2. **Revert Edge Functions** (if needed):
   ```bash
   # Redeploy previous version
   git checkout <previous-commit>
   npx supabase functions deploy openai-chat
   npx supabase functions deploy swarm-admin-api
   ```

3. **Document issues** in verification checklist

## Production Promotion

Only promote to production after:
- ✅ All 7 verification tests pass
- ✅ Console logs show correct behavior
- ✅ Network traces confirm proper API calls
- ✅ Audit logs capture all write operations
- ✅ Access control verified
- ✅ Verification checklist signed off

## Support

For issues during deployment:
1. Check console logs for error details
2. Review Network tab for failed API calls
3. Query Supabase logs for Edge Function errors
4. Check `admin_action_logs` for audit trail
5. Reference `PHASE_D_UI_SCHEMA_SAFE_COMPLETE.md` for implementation details

## Key Files

- Implementation: `src/pages/admin/SwarmsPageEnhanced.tsx`
- Migration: `supabase/migrations/20251019000000_create_admin_action_logs.sql`
- Documentation: `PHASE_D_UI_SCHEMA_SAFE_COMPLETE.md`
- Deployment Script: `scripts/deploy-staging-phase-d.sh`
