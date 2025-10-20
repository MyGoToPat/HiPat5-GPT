# Deploy CORS Fix - Phase B

## What's Ready
✅ Files updated locally with CORS fix
✅ Database telemetry infrastructure created
✅ Feature flag enabled
✅ Project builds successfully

## Quick Deploy

Run this command from project root:

```bash
supabase functions deploy openai-chat
```

Or use the deployment script:

```bash
bash deploy-openai-chat.sh
```

## What This Fixes

The CORS headers now include `cache-control` and `pragma` which the Supabase JS client sends with every request.

**Before:**
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
```

**After:**
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control, pragma'
```

## Test After Deploy

Send these 3 messages in the app:
1. `hey`
2. `what are the macros of an avocado`
3. `i ate 2 eggs and toast for breakfast`

All three should work without CORS errors.

## Verify Telemetry

Check that tool routing is being logged:

```sql
SELECT
  created_at,
  actor_uid,
  action,
  target,
  payload->>'msgPreview' as msg_preview,
  payload->>'toolName' as tool_name,
  payload->>'roleTarget' as role_target
FROM admin_action_logs
WHERE action = 'tool_route'
ORDER BY created_at DESC
LIMIT 10;
```

Expected results:
- Message 1 (`hey`): `toolName: null`, `roleTarget: persona`
- Message 2 (`macros of avocado`): `toolName: get_macros`, `roleTarget: macro`
- Message 3 (`i ate...`): `toolName: log_meal`, `roleTarget: tmwya`

## Files Changed

1. `supabase/functions/openai-chat/cors.ts` - Added cache-control, pragma
2. `supabase/functions/_shared/cors.ts` - Added cache-control, pragma (for other functions)
3. `supabase/functions/tmwya-process-meal/index.ts` - Deployed stub (already done via MCP)

## Next Steps After Verification

Once telemetry is verified working:
1. Disable console logging of tool routes (optional)
2. Set up dashboard/monitoring for tool usage patterns
3. Use data to optimize intent detection
