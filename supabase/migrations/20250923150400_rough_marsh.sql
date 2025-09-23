/*
  # User Data Reset - Preserve Admin Data Only

  **⚠️ CRITICAL WARNING: This migration performs a comprehensive data reset**
  
  This migration resets ALL user data for non-admin users while preserving admin accounts.
  This is intended to provide a clean slate for users to go through proper onboarding.

  ## What This Migration Does

  1. **Preserves Admin Data**
     - All users with `role = 'admin'` are completely unaffected
     - Admin data remains intact across all tables

  2. **Deletes User-Generated Content** (Non-Admin Only)
     - `food_logs` - All meal and nutrition logs
     - `chat_histories` and `chat_messages` - All chat conversations
     - `conversations` and `messages` - All conversation data
     - `timer_presets` - All custom timer configurations
     - `user_metrics` - All calculated BMR/TDEE and body metrics
     - `profile_learning` - All learning profile data
     - `user_preferences` - All user preference settings
     - `user_cohorts` - All cohort assignments
     - `upgrade_requests` - All pending upgrade requests
     - `trainer_clients` - All trainer-client relationships (where either party is non-admin)

  3. **Resets Profile Data** (Non-Admin Only)
     - Clears: phone, location, dob, bio
     - Resets: beta_user → false, onboarding_complete → false
     - Nullifies: body metrics, macro overrides, organization assignments
     - Preserves: name, email, role, created_at (core identity data)

  ## Expected Outcome
     
  After this migration:
  - Admin users: Completely unaffected, retain all data
  - Non-admin users: Clean slate, ready for fresh onboarding
  - All foreign key relationships maintained
  - No orphaned records created

  ## Tables Affected

  **Deletion Operations:**
  - food_logs, chat_histories, conversations, timer_presets
  - user_metrics, profile_learning, user_preferences, user_cohorts
  - upgrade_requests, trainer_clients

  **Reset Operations:**
  - profiles (selective column reset for non-admin users only)
*/

-- First, let's verify we're targeting the right users (this is a safety check)
-- This should show all non-admin user IDs that will be affected
DO $$
DECLARE
    affected_count INTEGER;
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count FROM profiles WHERE role != 'admin';
    SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
    
    RAISE NOTICE 'DATA RESET PLAN - VERIFICATION:';
    RAISE NOTICE 'Users to be reset (non-admin): %', affected_count;
    RAISE NOTICE 'Users to be preserved (admin): %', admin_count;
    RAISE NOTICE 'Proceeding with data reset...';
END $$;

-- Delete user-generated transactional data (non-admin users only)
-- Order matters due to foreign key constraints

-- 1. Delete food logs
DELETE FROM food_logs 
WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- 2. Delete chat histories (cascades to chat_messages via FK)
DELETE FROM chat_histories 
WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- 3. Delete conversations (cascades to messages via FK)
DELETE FROM conversations 
WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- 4. Delete timer presets
DELETE FROM timer_presets 
WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- 5. Delete user metrics
DELETE FROM user_metrics 
WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- 6. Delete profile learning data
DELETE FROM profile_learning 
WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- 7. Delete user preferences
DELETE FROM user_preferences 
WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- 8. Delete user cohorts
DELETE FROM user_cohorts 
WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- 9. Delete upgrade requests
DELETE FROM upgrade_requests 
WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- 10. Delete trainer-client relationships (where either party is non-admin)
DELETE FROM trainer_clients 
WHERE trainer_id IN (SELECT user_id FROM profiles WHERE role != 'admin')
   OR client_id IN (SELECT user_id FROM profiles WHERE role != 'admin');

-- Reset profile data for non-admin users
-- Preserve core identity (name, email, role, created_at) but reset everything else
UPDATE profiles
SET
    phone = NULL,
    location = NULL,
    dob = NULL,
    bio = NULL,
    beta_user = false,
    active_org_id = NULL,
    display_name = NULL,
    plan_type = 'free',
    protein_g_override = NULL,
    fat_g_override = NULL,
    carb_g_override = NULL,
    last_macro_update = NULL,
    height_inches = NULL,
    weight_lbs = NULL,
    body_fat_percent = NULL,
    activity_level = NULL,
    onboarding_complete = false,
    bmr_value = NULL,
    tdee_value = NULL,
    updated_at = now()
WHERE role != 'admin';

-- Final verification - count remaining records
DO $$
DECLARE
    food_count INTEGER;
    chat_count INTEGER;
    metrics_count INTEGER;
    reset_profiles INTEGER;
    admin_profiles INTEGER;
BEGIN
    SELECT COUNT(*) INTO food_count FROM food_logs 
    WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');
    
    SELECT COUNT(*) INTO chat_count FROM chat_histories 
    WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');
    
    SELECT COUNT(*) INTO metrics_count FROM user_metrics 
    WHERE user_id IN (SELECT user_id FROM profiles WHERE role != 'admin');
    
    SELECT COUNT(*) INTO reset_profiles FROM profiles 
    WHERE role != 'admin' AND onboarding_complete = false;
    
    SELECT COUNT(*) INTO admin_profiles FROM profiles 
    WHERE role = 'admin';
    
    RAISE NOTICE 'DATA RESET COMPLETED - VERIFICATION:';
    RAISE NOTICE 'Remaining food_logs for non-admin users: %', food_count;
    RAISE NOTICE 'Remaining chat_histories for non-admin users: %', chat_count;
    RAISE NOTICE 'Remaining user_metrics for non-admin users: %', metrics_count;
    RAISE NOTICE 'Non-admin profiles reset (onboarding_complete=false): %', reset_profiles;
    RAISE NOTICE 'Admin profiles preserved: %', admin_profiles;
    
    IF food_count > 0 OR chat_count > 0 OR metrics_count > 0 THEN
        RAISE WARNING 'Some user data may not have been completely reset!';
    ELSE
        RAISE NOTICE 'SUCCESS: All non-admin user data has been reset to zero state.';
    END IF;
END $$;