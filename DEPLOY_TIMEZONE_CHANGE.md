# Timezone Standardization Deployment Guide

## Quick Start - Deployment Steps

### 1. Pre-Deployment Checklist
- ✅ Build completed successfully (verified)
- ✅ Migrations created and tested
- ✅ Documentation complete
- ✅ Code review completed

### 2. Deploy Migrations to Supabase

The migrations will automatically run when you deploy via Supabase CLI or when Supabase detects new migration files. The migrations are safe and include:

**Migration Order:**
1. `20251010000000_set_eastern_time_default.sql` - Updates existing users
2. `20251010000001_ensure_user_preferences_with_eastern_time.sql` - Sets up new user defaults

**What They Do:**
- Update all existing users to Eastern Time
- Set database default to America/New_York
- Create trigger for auto-setting timezone on new signups
- Enhance user creation to include preferences
- Backfill missing user_preferences records

### 3. Verify Deployment

After migrations run, check the migration logs for verification output:

```
NOTICE: Timezone Migration Complete:
NOTICE:   Total users in user_preferences: X
NOTICE:   Users now set to Eastern Time: X
NOTICE:   Percentage: 100.00

NOTICE: User Preferences with Eastern Time Setup:
NOTICE:   Total authenticated users: X
NOTICE:   Users with preferences: X
NOTICE:   Users with Eastern Time: X
NOTICE:   Coverage: 100.00
```

### 4. Test in Production

**Test New User Registration:**
1. Create a new test account
2. Verify the user gets a `user_preferences` record
3. Confirm timezone is set to `America/New_York`

**Test Existing User:**
1. Log in as an existing user
2. Navigate to Profile → Personal Information
3. Verify timezone shows "Eastern Time (ET)"
4. Confirm time display is correct

**Test Timezone Change:**
1. Click Edit in Personal Information
2. Change timezone to Pacific Time
3. Save changes
4. Verify it persists and time updates

### 5. Monitor

**First 24 Hours:**
- Monitor user support tickets for timezone-related issues
- Check error logs for timezone-related errors
- Verify new user registrations get Eastern Time
- Confirm no issues with time-based features

**SQL Monitoring Queries:**

```sql
-- Check timezone distribution
SELECT timezone, COUNT(*) as count
FROM user_preferences
GROUP BY timezone
ORDER BY count DESC;

-- Verify new users get preferences
SELECT COUNT(*)
FROM auth.users au
LEFT JOIN user_preferences up ON au.id = up.user_id
WHERE up.user_id IS NULL;
-- Should return 0

-- Check recent signups have ET
SELECT
  au.created_at,
  up.timezone
FROM auth.users au
JOIN user_preferences up ON au.id = up.user_id
WHERE au.created_at > NOW() - INTERVAL '24 hours'
ORDER BY au.created_at DESC;
-- All should show 'America/New_York'
```

---

## Rollback Plan (If Needed)

If you need to rollback the changes:

### Option 1: Keep Changes, Allow User Choice
**Recommended** - Users can already change their timezone in the UI
- No action needed
- Users self-select their preferred timezone

### Option 2: Remove Defaults
```sql
-- Remove column default
ALTER TABLE user_preferences
ALTER COLUMN timezone DROP DEFAULT;

-- Remove trigger
DROP TRIGGER IF EXISTS ensure_timezone_on_insert ON user_preferences;
DROP FUNCTION IF EXISTS ensure_timezone_default();

-- Note: Existing data stays as Eastern Time
-- New users will need to manually select timezone
```

---

## Communication Template (Optional)

If you want to notify users:

**Subject:** System Update: Timezone Standardization

**Body:**
> Hi there,
>
> We've standardized all user accounts to Eastern Time (ET) to ensure consistent scheduling and time-based features across our platform.
>
> **What this means for you:**
> - Your timezone setting has been updated to Eastern Time
> - All times will now display in ET by default
> - Your data is completely safe and unchanged
>
> **Want to change your timezone?**
> You can update your timezone preference anytime:
> 1. Go to Profile → Personal Information
> 2. Click Edit
> 3. Select your preferred timezone from the dropdown
> 4. Click Save
>
> We support all major US timezones plus UTC.
>
> If you have any questions or concerns, please contact support.
>
> Thanks,
> [Your Team]

---

## Success Metrics

After deployment, you should see:

- ✅ 100% of users with timezone set
- ✅ 100% of users with Eastern Time (or their chosen alternative)
- ✅ New user registrations include user_preferences
- ✅ Trigger creating preferences on signup
- ✅ No increase in timezone-related support tickets
- ✅ Time-based features working correctly

---

## Troubleshooting

### Issue: Migration Fails
**Solution:** Check migration logs for specific error. Most likely causes:
- Syntax error (review SQL)
- Permission issue (ensure proper grants)
- Conflict with existing data (migrations use ON CONFLICT DO NOTHING)

### Issue: User Reports Wrong Time
**Solution:**
1. Verify their timezone in user_preferences
2. Confirm browser timezone doesn't override display
3. Check if time zone selection in UI works
4. Verify formatCurrentTime() function works

### Issue: New Users Don't Get Preferences
**Solution:**
1. Check if trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created'`
2. Verify trigger function exists: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user'`
3. Check auth.users table for recent inserts
4. Look for errors in database logs

---

## Files Deployed

### Database
- `supabase/migrations/20251010000000_set_eastern_time_default.sql`
- `supabase/migrations/20251010000001_ensure_user_preferences_with_eastern_time.sql`

### Application
- No frontend code changes required (component already had ET default)

### Documentation
- `TIMEZONE_STANDARDIZATION.md` - Complete technical documentation
- `DEPLOY_TIMEZONE_CHANGE.md` - This deployment guide

---

## Post-Deployment Checklist

- [ ] Migrations applied successfully
- [ ] Verification logs show 100% coverage
- [ ] Test user registration creates preferences
- [ ] Existing user can view/change timezone in UI
- [ ] Time displays correctly across application
- [ ] No errors in application logs
- [ ] No increase in support tickets
- [ ] (Optional) User communication sent
- [ ] Monitoring queries bookmarked
- [ ] Team notified of change

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Status:** [ ] Success  [ ] Issues  [ ] Rolled Back
**Notes:** _________________________________

---

For full technical details, see `TIMEZONE_STANDARDIZATION.md`
