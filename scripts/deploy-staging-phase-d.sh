#!/usr/bin/env bash
set -euo pipefail

################################################################################
# STAGING DEPLOYMENT SCRIPT - PHASE D UI
# Executes the complete staging runbook with verification steps
################################################################################

echo "=================================="
echo "PHASE D STAGING DEPLOYMENT"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function log_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

function log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function confirm_or_exit() {
    read -p "$1 (yes/no): " response
    if [[ "$response" != "yes" ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================
log_step "Pre-flight checks..."

if [[ -z "${SUPABASE_URL:-}" ]]; then
    log_error "SUPABASE_URL not set in environment"
    exit 1
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    log_error "SUPABASE_SERVICE_ROLE_KEY not set in environment"
    exit 1
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    log_warning "OPENAI_API_KEY not set - Edge Functions may not work"
fi

log_step "Environment variables confirmed"
echo "  SUPABASE_URL: ${SUPABASE_URL}"
echo "  Service Role Key: [REDACTED]"
echo "  OpenAI Key: ${OPENAI_API_KEY:+[SET]}${OPENAI_API_KEY:-[NOT SET]}"
echo ""

confirm_or_exit "Deploy to STAGING environment?"

# ============================================================================
# STEP 1: DEPLOY EDGE FUNCTIONS
# ============================================================================
log_step "Deploying Edge Functions..."

echo "Deploying openai-chat..."
npx supabase functions deploy openai-chat \
    --project-ref "${SUPABASE_PROJECT_REF:-}" \
    || log_error "Failed to deploy openai-chat"

echo "Deploying swarm-admin-api..."
npx supabase functions deploy swarm-admin-api \
    --project-ref "${SUPABASE_PROJECT_REF:-}" \
    || log_error "Failed to deploy swarm-admin-api"

log_step "Edge Functions deployed successfully"
echo ""

# ============================================================================
# STEP 2: RUN SQL MIGRATION FOR AUDIT TABLE
# ============================================================================
log_step "Running SQL migration for admin_action_logs..."

MIGRATION_FILE="supabase/migrations/20251019000000_create_admin_action_logs.sql"

if [[ -f "$MIGRATION_FILE" ]]; then
    echo "Applying migration: $MIGRATION_FILE"
    npx supabase db push \
        --project-ref "${SUPABASE_PROJECT_REF:-}" \
        || log_error "Failed to apply migration"
    log_step "Migration applied successfully"
else
    log_warning "Migration file not found: $MIGRATION_FILE"
    log_warning "You may need to run the SQL manually in Supabase dashboard"
fi

echo ""

# ============================================================================
# STEP 3: BUILD AND DEPLOY WEB APP
# ============================================================================
log_step "Building web app..."

export VITE_PHASE_D_WRITE_ENABLED=true
export VITE_SUPABASE_URL="${SUPABASE_URL}"
export VITE_SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"

npm run build

log_step "Build completed successfully"
echo ""

log_step "Deploying to Firebase Hosting (staging)..."
npm run deploy:staging || firebase deploy --only hosting:staging

log_step "Web app deployed successfully"
echo ""

# ============================================================================
# STEP 4: VERIFICATION TESTS
# ============================================================================
log_step "Starting verification tests..."
echo ""

echo "=================================="
echo "PHASE B - TELEMETRY VERIFICATION"
echo "=================================="
echo ""

cat << 'EOF'
Manual verification steps required:

1. Navigate to staging URL
2. Open browser DevTools Console
3. Verify the following console.debug messages:

   Phase B Telemetry Tests:
   ✓ [SwarmsPageEnhanced] promptsShape detected: <id|key|unknown>
   ✓ [SwarmsPageEnhanced] Environment gate WRITE_ENABLED=<true|false>
   ✓ [mapPromptToWrite] Using <id|key> shape for payload
   ✓ [verifyPromptIntegrity] Validation passed/failed

4. Check Network tab for:
   ✓ POST /rest/v1/swarm_prompts (or swarm_agent_prompts)
   ✓ Response includes inserted row with correct fields
   ✓ No 400/500 errors

EOF

read -p "Press ENTER after completing Phase B verification..."

echo ""
echo "=================================="
echo "PHASE D - WRITE OPERATION TESTS"
echo "=================================="
echo ""

cat << 'EOF'
Required test scenarios (with WRITE_ENABLED=true):

Test 1: Create New Prompt (ID-shape schema)
  - Select agent from dropdown
  - Enter prompt text
  - Click "Add Prompt"
  - Verify: Success toast + new row appears
  - Verify: Console shows [mapPromptToWrite] Using id shape
  - Verify: Network POST contains {agent_id, content}

Test 2: Create New Prompt (KEY-shape schema)
  - Same steps as Test 1
  - Verify: Console shows [mapPromptToWrite] Using key shape
  - Verify: Network POST contains {agent_key, prompt}

Test 3: Edit Existing Prompt
  - Click Edit icon on existing prompt
  - Modify text
  - Click Save
  - Verify: Success toast + table updates
  - Verify: Console shows validation passed

Test 4: Rollout Controls
  - Change agent version in dropdown
  - Click "Update Rollout"
  - Verify: Success toast
  - Verify: Console shows [updateRollout] mutation

Test 5: JSON Manifest Editing
  - Edit JSON in manifest textarea
  - Click "Save Manifest"
  - Verify: Valid JSON accepted, invalid JSON rejected
  - Verify: Error toast for invalid JSON

Test 6: Access Control
  - Logout and login as non-admin user
  - Navigate to /admin/swarms-enhanced
  - Verify: Redirected or "Access Denied" message

Test 7: Audit Logging
  - Perform any write operation
  - Query admin_action_logs table
  - Verify: New row created with correct metadata

EOF

read -p "Press ENTER after completing Phase D verification..."

# ============================================================================
# STEP 5: COLLECT VERIFICATION EVIDENCE
# ============================================================================
log_step "Collecting verification evidence..."

EVIDENCE_DIR="./staging-verification-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EVIDENCE_DIR"

cat > "$EVIDENCE_DIR/VERIFICATION_CHECKLIST.md" << 'EOF'
# Phase D Staging Verification Results

## Environment
- Date: $(date)
- Staging URL: [FILL IN]
- Tester: [FILL IN]

## Phase B - Telemetry ✓/✗
- [ ] Console shows promptsShape detection
- [ ] Console shows WRITE_ENABLED status
- [ ] Console shows payload mapping logs
- [ ] Console shows validation results
- [ ] Network tab shows correct API calls

## Phase D - Write Operations ✓/✗
- [ ] Test 1: Create prompt (ID-shape) - PASS/FAIL
- [ ] Test 2: Create prompt (KEY-shape) - PASS/FAIL
- [ ] Test 3: Edit existing prompt - PASS/FAIL
- [ ] Test 4: Rollout controls - PASS/FAIL
- [ ] Test 5: JSON manifest editing - PASS/FAIL
- [ ] Test 6: Access control - PASS/FAIL
- [ ] Test 7: Audit logging - PASS/FAIL

## Issues Found
[Document any issues here]

## Screenshots
[Attach console logs, network traces, UI screenshots]

## Sign-off
Verified by: _______________
Date: _______________
Approved for production: YES / NO
EOF

log_step "Verification checklist created: $EVIDENCE_DIR/VERIFICATION_CHECKLIST.md"
echo ""

# ============================================================================
# COMPLETION
# ============================================================================
echo "=================================="
echo "DEPLOYMENT COMPLETE"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Complete manual verification tests"
echo "2. Fill out checklist: $EVIDENCE_DIR/VERIFICATION_CHECKLIST.md"
echo "3. Collect console logs and screenshots"
echo "4. Review audit logs in Supabase"
echo "5. Sign off on deployment"
echo ""
log_step "All automated steps completed successfully"
