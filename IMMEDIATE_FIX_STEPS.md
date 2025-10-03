# IMMEDIATE FIX - Deploy Updated Edge Function

## Problem

The edge function code has been updated locally but **hasn't been deployed to Supabase yet**. The old code is still running, which is why macros are coming back as zeros.

## Quick Fix (3 steps)

### Step 1: Deploy the Updated Edge Function

The `tmwya-process-meal` function needs to be redeployed with the new cache-first code.

**Option A: Using Supabase CLI (Recommended)**
```bash
cd /tmp/cc-agent/54491097/project
supabase functions deploy tmwya-process-meal
```

**Option B: Using the MCP tool (from this chat)**
I can deploy it for you using the `mcp__supabase__deploy_edge_function` tool.

### Step 2: Add Gemini API Key (Optional but Recommended)

Get a free Gemini API key:
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

Add to Supabase:
```bash
supabase secrets set GEMINI_API_KEY=<your-key-here>
```

Or via Dashboard:
- Project Settings → Edge Functions → Environment Variables
- Add `GEMINI_API_KEY`

### Step 3: Apply Database Migrations

```bash
supabase db push
```

Or manually apply in Supabase Dashboard:
- Database → SQL Editor
- Run the contents of these files:
  - `supabase/migrations/20251003000000_seed_food_cache_common_foods.sql`
  - `supabase/migrations/20251003000100_add_cache_analytics.sql`

## Why This Happened

The optimization code was written and built locally, but edge functions need to be explicitly deployed to Supabase Cloud. The local changes don't automatically sync.

## Test After Deployment

Try logging a meal again:
```
"I ate chicken breast and rice"
```

Expected result:
- ✅ Macros should appear (not zeros)
- ✅ Console should show cache hits or API calls
- ✅ Verification screen should show proper calories/macros

## Alternative: I Can Deploy It Now

Would you like me to deploy the edge function for you using the MCP Supabase tool? I can do this right now if you'd like.

Just say "yes, deploy it" and I'll use the `mcp__supabase__deploy_edge_function` tool to push the updated code to your Supabase project.
