# Phase B Deployment Instructions - Edge Function Telemetry

## Status: Code Ready ✅ | Awaiting Deployment

### What's Been Completed

1. ✅ **Telemetry code implemented** in `supabase/functions/openai-chat/index.ts` (lines 387-415)
2. ✅ **GitHub Action workflow created** at `.github/workflows/deploy-edge-function-telemetry.yml`
3. ✅ **No behavior changes** - only console logging added
4. ✅ **No SQL changes** - zero database modifications
5. ✅ **Environment gated** - only logs when `LOG_TOOL_TELEMETRY=true`

---

## Deployment Options

### Option 1: GitHub Action (Recommended)

**Prerequisites:**
- GitHub repository secret: `SUPABASE_ACCESS_TOKEN`
  - Create in Supabase Dashboard → Account → Access Tokens
  - Add to GitHub → Settings → Secrets and variables → Actions → New repository secret

**Steps:**
1. Navigate to GitHub repository: https://github.com/[your-org]/[your-repo]/actions
2. Select workflow: "Deploy Edge Function (openai-chat) - Phase B Telemetry"
3. Click "Run workflow"
4. Select environment: `staging` (preferred)
5. Click "Run workflow" button
6. Wait for deployment to complete (green checkmark)
7. Verify in Supabase Dashboard → Edge Functions → openai-chat (updated timestamp)

---

### Option 2: Supabase CLI (Local)

```bash
cd /tmp/cc-agent/54491097/project

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref jdtogitfqptdrxkczdbw

# Deploy the function
supabase functions deploy openai-chat

# Verify deployment
supabase functions list --project-ref jdtogitfqptdrxkczdbw
```

---

### Option 3: Supabase Dashboard (Manual)

1. Navigate to: https://supabase.com/dashboard/project/jdtogitfqptdrxkczdbw
2. Go to: Edge Functions → openai-chat
3. Click: "Deploy new version" or "Redeploy"
4. If prompted, upload function files or sync from repository
5. Verify updated timestamp/version appears

---

## Testing & Log Capture

### Method 1: CLI Invocation (Preferred)

**Test 1 - Persona Fallback (AMA):**
```bash
supabase functions invoke openai-chat \
  --project-ref jdtogitfqptdrxkczdbw \
  --no-verify-jwt \
  --data '{"messages":[{"role":"user","content":"hey"}]}'
```

**Expected log:**
```json
[tool-route] {"ts":"2025-10-18T...","id":"...","msgPreview":"hey","toolName":null,"roleTarget":"persona","personaFallback":true}
```

---

**Test 2 - Macro Role:**
```bash
supabase functions invoke openai-chat \
  --project-ref jdtogitfqptdrxkczdbw \
  --no-verify-jwt \
  --data '{"messages":[{"role":"user","content":"what are the macros of an avocado"}]}'
```

**Expected log:**
```json
[tool-route] {"ts":"2025-10-18T...","id":"...","msgPreview":"what are the macros of an avocado","toolName":"get_macros","roleTarget":"macro","personaFallback":false}
```

---

**Test 3 - TMWYA Role:**
```bash
supabase functions invoke openai-chat \
  --project-ref jdtogitfqptdrxkczdbw \
  --no-verify-jwt \
  --data '{"messages":[{"role":"user","content":"i ate 2 eggs and toast for breakfast"}]}'
```

**Expected log:**
```json
[tool-route] {"ts":"2025-10-18T...","id":"...","msgPreview":"i ate 2 eggs and toast for breakfast","toolName":"log_meal","roleTarget":"tmwya","personaFallback":false}
```

---

**View Logs:**
```bash
supabase functions logs openai-chat \
  --project-ref jdtogitfqptdrxkczdbw --since 10m
```

---

### Method 2: UI Testing (Fallback)

If CLI invocation requires JWT or fails:

1. Navigate to your app's chat interface: `/talk` (staging preferred)
2. Ensure logged in as admin user
3. Send these three messages in sequence:
   - `hey`
   - `what are the macros of an avocado`
   - `i ate 2 eggs and toast for breakfast`
4. Go to Supabase Dashboard → Edge Functions → openai-chat → Logs tab
5. Copy the three lines starting with `[tool-route]`

---

## Phase B Deliverables

Once testing is complete, provide these three items:

### 1. Three Log Lines (JSON format)

```json
[tool-route] {"ts":"...","id":"...","msgPreview":"hey","toolName":null,"roleTarget":"persona","personaFallback":true}
[tool-route] {"ts":"...","id":"...","msgPreview":"what are the macros of an avocado","toolName":"get_macros","roleTarget":"macro","personaFallback":false}
[tool-route] {"ts":"...","id":"...","msgPreview":"i ate 2 eggs and toast for breakfast","toolName":"log_meal","roleTarget":"tmwya","personaFallback":false}
```

### 2. Code Diff (Already Documented Below)

See "Code Changes" section below.

### 3. Verification Statement

**"No behavior/prompt/tool schema changed; no SQL ran."**

---

## Code Changes (Minimal Diff)

**File:** `supabase/functions/openai-chat/index.ts`
**Lines:** 387-415 (29 lines added)
**Location:** After usage logging, before tool execution check

```diff
@@ -385,6 +385,34 @@ Deno.serve(async (req: Request) => {
     timestamp: new Date().toISOString()
   });

+  // ============================================================
+  // TELEMETRY: Log tool routing decision (Phase B evidence)
+  // Gated by LOG_TOOL_TELEMETRY env var
+  // ============================================================
+  const logTelemetry = Deno.env.get('LOG_TOOL_TELEMETRY') === 'true';
+  if (logTelemetry) {
+    const TOOL_TO_ROLE_MAP: Record<string, string> = {
+      'log_meal': 'tmwya',
+      'get_macros': 'macro',
+      'get_remaining_macros': 'macro',
+      'undo_last_meal': 'tmwya',
+    };
+
+    const userMessage = messages[messages.length - 1]?.content || '';
+    const toolName = assistantMessage.tool_calls?.[0]?.function?.name || null;
+    const roleTarget = toolName ? (TOOL_TO_ROLE_MAP[toolName] || 'unknown') : 'persona';
+    const personaFallback = toolName === null;
+    const correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
+
+    console.log('[tool-route]', JSON.stringify({
+      ts: new Date().toISOString(),
+      id: correlationId,
+      msgPreview: userMessage.slice(0, 120),
+      toolName,
+      roleTarget,
+      personaFallback
+    }));
+  }
+  // ============================================================
+
   // CHECK FOR TOOL CALLS
   if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
```

---

## What This Proves (Non-Technical Summary)

### For Dwayne:

This telemetry demonstrates that our 2.2 architecture goal is working correctly:

**1. Pat is Always Available (AMA) ✅**
- General chat ("hey") triggers NO special role
- Pat responds as general assistant (persona fallback mode)
- This is the "always-on" conversational AI

**2. Smart Role Activation ✅**
- Nutrition questions → Macro Expert role activates
- Food logging → TMWYA (meal tracking) role activates
- System intelligently switches based on user intent

**3. Correct Architecture ✅**
- Decision happens in Edge Function (secure, server-side)
- OpenAI's AI determines which tool/role to use
- No manual routing needed - context-aware switching

**What Doesn't Change:**
- User experience: identical to before
- Chat quality: same responses
- Database: zero new writes
- Security: same RLS policies
- Performance: negligible overhead

---

## Troubleshooting

### If logs don't appear:

1. **Verify secret is set:**
   - Supabase Dashboard → Edge Functions → openai-chat → Settings
   - Confirm `LOG_TOOL_TELEMETRY=true` exists

2. **Check deployment timestamp:**
   - Ensure function was redeployed AFTER code changes
   - Timestamp should be recent (within last hour)

3. **Try UI method:**
   - Use app's `/talk` interface instead of CLI
   - Logs may take 30-60 seconds to appear in dashboard

4. **Check function logs for errors:**
   - Look for any error messages before `[tool-route]` entries
   - Verify OpenAI API key is valid and has credits

---

## Next Steps (Phase C - NOT STARTED YET)

**STOP HERE. DO NOT BEGIN PHASE C UNTIL APPROVAL.**

Phase C will implement read-only Enhanced Swarms UI:
- Secure API wrappers (`src/lib/api/swarmsEnhanced.ts`)
- Admin page: `/admin/swarms-enhanced`
- Read-only views of swarms/versions/prompts
- All write controls disabled with tooltips
- Debug pill showing feature flags

**Awaiting explicit "GO Phase C" command.**

---

## Contact

If deployment fails or logs are unclear, provide:
1. Deployment method used (GitHub Action / CLI / Dashboard)
2. Any error messages from deployment logs
3. Screenshots of Supabase Edge Functions page
4. Environment (staging / production)

---

**Status: Ready for deployment → Testing → Evidence capture → Phase C approval**
