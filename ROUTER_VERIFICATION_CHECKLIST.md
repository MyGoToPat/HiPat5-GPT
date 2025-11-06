# PERSONALITY_ROUTER Verification Checklist

## ✅ STEP 1 - DB State Confirmed (COMPLETE)

**Status:** ✅ VERIFIED via screenshot

**Results:**
- `agent_prompts`: `PERSONALITY_ROUTER` exists with `phase=pre, exec_order=15`
- `agent_configs.config->agents`: `PERSONALITY_ROUTER` exists with `phase=pre, order_index=15`
- Router positioned correctly between Voice (10) and Audience (20)

---

## 🔄 STEP 2 - Admin UI Edit/Persist Test (MANUAL TEST REQUIRED)

**Task:** Test prompt editing persistence

**Steps:**
1. Navigate to `/admin/swarms`
2. Click **Edit** on `PERSONALITY_CORE_RESPONDER`
3. Change `"Summary first in 1–2 short paragraphs."` → `"Summary first in 1–3 short paragraphs."`
4. Click **Save** (`data-testid="prompt-save"`)
5. Observe:
   - ✅ Green toast: "Prompt updated"
   - ✅ Network tab: `swarm-admin-api` invoke returns `{ ok: true }`
6. **Reload page** (hard refresh: Ctrl+Shift+R)
7. Reopen edit modal → verify text still shows **"1–3"**

**What to capture:**
- Screenshot of success toast
- Network tab screenshot showing `swarm-admin-api` response
- Screenshot of reloaded modal showing "1–3"

**If failure:**
- Browser console error (should show detailed JSON from function)
- Edge Function logs: Supabase Dashboard → Functions → `swarm-admin-api` → Logs

---

## 🔄 STEP 3 - Router Load Log Verification (MANUAL TEST REQUIRED)

**Task:** Verify runtime router loading

**Steps:**
1. Open browser console (F12)
2. Navigate to `/chat` or reload app
3. Look for log line:

```
[swarm-loader] personality agents loaded: <N> hasRouter= true
```

**What to capture:**
- Screenshot of console showing the exact log line
- Note the agent count (`<N>`)

**Expected:** Log appears on app load/chat page load

---

## 🔄 STEP 4 - Router Behavior Runtime Tests (MANUAL TEST REQUIRED)

**Task:** Test 3 routing scenarios

### Test A: AMA Conceptual
**Input:** `"What are macros?"`

**Expected Console Logs:**
```
[router] decision { route_to: "ama", use_gemini: false, reason: "conversational", confidence: 0.X }
[intentRouter] Personality router decision { route_to: "ama", ... }
[modelRouter] Selected via router hints { provider: "openai", model: "gpt-4o-mini", reason: "personality_routing" }
```

**Expected Network:**
- Function called: `openai-chat`
- Response: Chat message from Pat

**What to capture:**
- Screenshot of console logs
- Network tab showing `openai-chat` call

---

### Test B: Brand/Fast-Food
**Input:** `"Tell me the macros for a Big Mac and large fries."`

**Expected Console Logs:**
```
[router] decision { route_to: "tmwya", use_gemini: true, reason: "role_task", confidence: 0.X }
[intentRouter] Personality router decision { route_to: "tmwya", ... }
[modelRouter] Selected via router hints { provider: "gemini", model: "gemini-2.5-flash", reason: "personality_routing" }
[nutrition] Processing nutrition query...
```

**Expected Network:**
- Function called: `nutrition-gemini`
- UI: Verification card renders with Big Mac + fries macros

**What to capture:**
- Screenshot of console logs
- Network tab showing `nutrition-gemini` call
- Screenshot of verification card

---

### Test C: Web Research with Citations
**Input:** `"Find two 2024 studies on creatine and sleep and cite links."`

**Expected Console Logs:**
```
[router] decision { route_to: "ama", use_gemini: true, reason: "requires_web_search", confidence: 0.X }
[modelRouter] Selected via needsWeb { provider: "gemini", model: "gemini-2.5-pro", reason: "web_research" }
```

**Expected Network:**
- Function called: `ama-web`
- Response: Message with study citations and links

**What to capture:**
- Screenshot of console logs (showing `needsWeb` priority)
- Network tab showing `ama-web` call
- Screenshot of response with citations

---

## ✅ STEP 5 - Guardrails (AUTOMATED - READY)

**Status:** ✅ Tests exist and ready

### Playwright Tests
**File:** `tests/admin.swarm.spec.ts`
- ✅ Router row visibility test
- ✅ Edit/persist test for `PERSONALITY_CORE_RESPONDER`
- ✅ Add agent test

**Run:** `npm run test:e2e` or `npx playwright test tests/admin.swarm.spec.ts`

### SQL Verification Script
**File:** `tests/scripts/verify-router.sql`
- ✅ Checks prompt exists
- ✅ Checks config reference
- ✅ Verifies order positioning

**Run:** Copy SQL to Supabase SQL Editor and execute

### Node.js Verification Script
**File:** `tests/scripts/verify-router.mjs`
- ✅ Programmatic check with exit codes

**Run:** `node tests/scripts/verify-router.mjs` (requires `SUPABASE_SERVICE_ROLE_KEY` env var)

---

## ⚠️ STEP 6 - Optional API Hardening (NOT IMPLEMENTED)

**Status:** Not implemented (optional)

**Would add:**
- `phase` and `exec_order` fields to `updatePrompt` operation
- UI form section to edit phase/order for prompts
- Validation and error handling

**Current behavior:** Admin API only updates `content` and `status` for prompts.

---

## 📋 Summary

### ✅ Completed (Code)
- Router exists in DB (verified via screenshot)
- Admin API contract correct and deployed
- UI uses `supabase.functions.invoke()` correctly
- Swarm loader logs added
- Router execution wiring optimized (no duplicate calls)
- Playwright tests ready
- SQL verification scripts ready

### 🔄 Requires Manual Testing
- **STEP 2:** Admin UI edit/persist test
- **STEP 3:** Console log verification
- **STEP 4:** Runtime router behavior (3 scenarios)

### ⚠️ Optional
- **STEP 6:** API hardening for phase/exec_order updates

---

## 🚀 Next Actions

1. **Run STEP 2** - Test Admin UI edit/persist
2. **Run STEP 3** - Verify console logs
3. **Run STEP 4** - Test 3 routing scenarios
4. **Run Playwright tests** - `npm run test:e2e`
5. **Run SQL verification** - Copy `tests/scripts/verify-router.sql` to Supabase

Once all manual tests pass, we're ready for beta! 🎉

