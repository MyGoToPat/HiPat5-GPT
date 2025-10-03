# Quick Setup Instructions

## What Was Implemented

1. **Macro Daily Reset Fix** - Meals now count toward the correct day based on user's timezone (12:01 AM - 12:00 PM midnight)
2. **Chat History System** - Complete session-based chat with persistence, real-time updates, and summarization

## Important Setup Steps

### 1. Database Migrations (Already Applied ✅)

The following migrations have been applied:
- `20251003050000_add_timezone_and_chat_sessions.sql` - Timezone support & chat schema
- `20251003050100_update_day_rollups_timezone_aware.sql` - Fixed day_rollups trigger

### 2. Edge Functions (Already Deployed ✅)

Two Edge Functions have been deployed:
- `chat-midnight-rollover` - Closes sessions at midnight
- `chat-summarize-session` - Generates session summaries

### 3. Required Action: Set Up Cron Job

You need to set up a cron job or scheduled task to call the midnight rollover function every 30 minutes:

**Option A: Using Supabase Edge Functions Cron (Recommended)**

Add this to your Supabase project's cron jobs (Database → Edge Functions → Cron):

```yaml
- name: "chat-midnight-rollover"
  schedule: "*/30 * * * *"  # Every 30 minutes
  function: "chat-midnight-rollover"
```

**Option B: Using External Cron Service**

Use a service like cron-job.org or your own server to call:

```bash
curl -X POST https://jdtogitfqptdrxkczdbw.supabase.co/functions/v1/chat-midnight-rollover
```

### 4. User Action: Update Timezone Preference

Users should update their timezone in preferences (currently defaults to UTC).

**Future Enhancement**: Add a timezone selector to the user preferences/settings page that allows users to:
- See their current timezone
- Select from IANA timezone list (e.g., 'America/New_York', 'Europe/London', 'Asia/Tokyo')
- Auto-detect timezone from browser as suggested default

### 5. Test the Implementation

#### Test Macro Reset (Timezone Boundaries)

1. **Set your timezone** in user_preferences table:
   ```sql
   UPDATE user_preferences
   SET timezone = 'America/New_York'
   WHERE user_id = 'YOUR_USER_ID';
   ```

2. **Log a meal late at night** (e.g., 11:50 PM your local time)
3. **Check day_rollups** - meal should count toward current day, not next day
4. **Log a meal after midnight** (e.g., 12:05 AM your local time)
5. **Check day_rollups** - meal should count toward new day

#### Test Chat Sessions

1. **Open chat** and send a message
2. **Check database**:
   ```sql
   -- Should see active session
   SELECT * FROM chat_sessions WHERE user_id = 'YOUR_USER_ID' AND active = true;

   -- Should see saved message
   SELECT * FROM chat_messages WHERE session_id = 'SESSION_ID' ORDER BY timestamp DESC;
   ```

3. **Refresh page** - chat history should load from database
4. **Open in two tabs** - messages should appear in real-time in both tabs

#### Test Session Closure & Summarization

1. **Close a session manually**:
   ```typescript
   await ChatManager.closeSession(sessionId, 'Test summary');
   ```

2. **Or trigger summarization** via Edge Function:
   ```bash
   curl -X POST https://jdtogitfqptdrxkczdbw.supabase.co/functions/v1/chat-summarize-session \
     -H "Authorization: Bearer YOUR_USER_JWT" \
     -H "Content-Type: application/json" \
     -d '{"session_id": "SESSION_ID"}'
   ```

3. **Check chat_summaries** table for generated summary

## Troubleshooting

### Issue: Meals still counting toward wrong day

**Solution**: Check that user's timezone is set correctly in `user_preferences` table:
```sql
SELECT timezone FROM user_preferences WHERE user_id = 'YOUR_USER_ID';
```

If NULL or 'UTC', update to user's actual timezone.

### Issue: Chat messages not saving

**Solution**: Check browser console for errors. Verify:
1. User is authenticated (`supabase.auth.getUser()` returns user)
2. RLS policies allow user to insert messages
3. Session exists and is active

### Issue: Real-time updates not working

**Solution**: Check Supabase Realtime is enabled for the tables:
1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for `chat_messages` and `chat_sessions` tables

### Issue: Midnight rollover not running

**Solution**: Verify cron job is set up correctly (see step 3 above). Test manually:
```bash
curl -X POST https://jdtogitfqptdrxkczdbw.supabase.co/functions/v1/chat-midnight-rollover
```

Should return JSON with `closed_sessions` count.

## Key Files Changed

### Database
- `supabase/migrations/20251003050000_add_timezone_and_chat_sessions.sql`
- `supabase/migrations/20251003050100_update_day_rollups_timezone_aware.sql`

### Edge Functions
- `supabase/functions/chat-midnight-rollover/index.ts`
- `supabase/functions/chat-summarize-session/index.ts`

### Frontend
- `src/lib/supabase.ts` - Added timezone helper functions
- `src/lib/chatSessions.ts` - NEW: Session management API
- `src/utils/chatManager.ts` - Updated to use sessions
- `src/components/DashboardPage.tsx` - Fixed meal query boundaries
- `src/components/ChatPat.tsx` - Integrated session loading

## FAQ

**Q: Do I need to migrate existing chat data?**
A: No, the migrations preserve existing data. Old `chat_histories` entries remain, and new chats use the session system.

**Q: What happens to meals logged before the timezone fix?**
A: Historical `day_rollups` entries may be inaccurate. The trigger only affects new meals going forward. You can reprocess historical data by deleting and re-inserting meal_logs if needed.

**Q: Can users have multiple active sessions?**
A: No, each user has one active session at a time. When they start chatting, the system gets or creates the active session. Sessions close at midnight or manually.

**Q: What timezone is used if user hasn't set one?**
A: Default is 'UTC'. Users should update their timezone preference for accurate macro tracking.

**Q: How do I view chat summaries?**
A: Query the `chat_summaries` table:
```sql
SELECT * FROM chat_summaries
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC;
```

The `facts` column contains extracted information as JSONB.

## Next Steps

1. ✅ Database migrations applied
2. ✅ Edge Functions deployed
3. ✅ Frontend code updated
4. ✅ Build successful
5. ⏳ **Set up cron job for midnight rollover**
6. ⏳ **Add timezone selector to user preferences UI** (future enhancement)
7. ⏳ **Test with real user data** (see testing section above)

## Support

For issues or questions, check:
- `/MACRO_RESET_AND_CHAT_HISTORY_IMPLEMENTATION.md` - Full implementation details
- Supabase logs - Edge Function execution logs
- Browser console - Frontend errors
- Database logs - Query errors and RLS violations
