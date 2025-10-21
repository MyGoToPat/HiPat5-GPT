# Agent Configuration System - Deployment Checklist

## Pre-Deployment Verification

### 1. Database Migration Review
- [ ] Review migration file: `supabase/migrations/20251021000000_comprehensive_agent_configuration_system.sql`
- [ ] Verify all new columns have safe defaults
- [ ] Confirm RLS policies are admin-only
- [ ] Check that migration is idempotent (safe to run multiple times)
- [ ] Verify backward compatibility with existing data

### 2. Code Review
- [ ] Review `AgentConfigPage.tsx` - Individual agent editor
- [ ] Review `SwarmAgentsList.tsx` - Agent pipeline view
- [ ] Review `SwarmsPageEnhanced.tsx` - Enhanced with Agents tab
- [ ] Verify all imports are correct
- [ ] Check TypeScript types are properly defined
- [ ] Ensure error handling is comprehensive

### 3. Environment Configuration
- [ ] Confirm `VITE_ADMIN_ENHANCED_WRITE_ENABLED` is set correctly:
  - Staging: `true` (for testing)
  - Production: `false` (read-only until ready)
- [ ] Verify Supabase connection is working
- [ ] Check admin user has proper role in database

## Deployment Steps

### Step 1: Staging Environment (TEST FIRST)

**1.1 Apply Database Migration**
```bash
# Connect to Staging Supabase
supabase link --project-ref [staging-project-id]

# Review the migration
cat supabase/migrations/20251021000000_comprehensive_agent_configuration_system.sql

# Apply migration
supabase db push

# Verify migration applied successfully
supabase db diff

# Check for any errors in Supabase dashboard
```

**1.2 Deploy Application Code**
```bash
# Ensure environment variable is set
echo "VITE_ADMIN_ENHANCED_WRITE_ENABLED=true" >> .env.staging

# Build application
npm run build

# Deploy to staging
[your deployment command]
```

**1.3 Verify Database State**
- [ ] Log into Supabase Dashboard
- [ ] Check all new tables exist:
  - `agent_config_templates`
  - `agent_performance_metrics`
  - `agent_token_usage`
  - `swarm_testing_sessions`
  - `agent_dependencies`
- [ ] Verify `agent_prompts` has new columns
- [ ] Check RLS policies are active
- [ ] Verify helper functions exist

**1.4 Test Admin Access**
- [ ] Log in as admin user
- [ ] Navigate to `/admin/swarms-enhanced`
- [ ] Verify "Agents" tab appears
- [ ] Click on an agent to edit
- [ ] Verify all tabs load (Prompt, Config, Performance, Testing)
- [ ] Make a test edit and save (should work with WRITE_ENABLED=true)

**1.5 Test Agent Management**
- [ ] Toggle an agent on/off
- [ ] Edit an agent's prompt
- [ ] Change agent configuration (temperature, tokens)
- [ ] Test voice agent configuration
- [ ] Verify performance metrics display
- [ ] Run a test on an agent

**1.6 Verify Zero User Impact**
- [ ] Check that regular users see no changes
- [ ] Verify swarm execution still works
- [ ] Test Chat with Pat - should work normally
- [ ] Test Talk with Pat - should work normally
- [ ] Confirm no errors in browser console
- [ ] Check database for any unexpected data

### Step 2: Staging Testing (1-2 Days)

**Test Scenarios**
- [ ] Create new agent configuration
- [ ] Edit existing agent prompt
- [ ] Publish agent from draft to published
- [ ] Disable an agent and verify swarm still works
- [ ] Enable agent again
- [ ] Test performance metrics accumulation
- [ ] Test token usage tracking
- [ ] Test swarm testing sessions
- [ ] Duplicate an agent
- [ ] Configure Pat's Voice agent
- [ ] Test voice agent with OpenAI Realtime API

**Performance Testing**
- [ ] Check page load times (should be <2s)
- [ ] Verify agent list renders quickly
- [ ] Test with multiple swarms
- [ ] Verify database queries are efficient
- [ ] Check memory usage in browser

**Security Testing**
- [ ] Verify non-admin users cannot access
- [ ] Test RLS policies prevent unauthorized access
- [ ] Verify write protection works when disabled
- [ ] Check audit trails (created_by, timestamps)

### Step 3: Production Deployment (Read-Only First)

**3.1 Deploy Migration to Production**
```bash
# IMPORTANT: Backup database first!
# Use Supabase Dashboard to create backup

# Connect to Production
supabase link --project-ref [production-project-id]

# Apply migration
supabase db push

# Verify success
supabase db diff
```

**3.2 Deploy Application (Read-Only Mode)**
```bash
# Ensure WRITE_ENABLED is FALSE
echo "VITE_ADMIN_ENHANCED_WRITE_ENABLED=false" >> .env.production

# Build and deploy
npm run build
[your deployment command]
```

**3.3 Verify Production (Read-Only)**
- [ ] Log in as admin
- [ ] Navigate to `/admin/swarms-enhanced`
- [ ] Verify Agents tab loads
- [ ] Confirm all write buttons show disabled tooltip
- [ ] Verify data displays correctly
- [ ] Check no errors occur
- [ ] Confirm regular users unaffected

### Step 4: Enable Write Mode (When Ready)

**Only after thorough staging testing:**

```bash
# Update environment variable
echo "VITE_ADMIN_ENHANCED_WRITE_ENABLED=true" >> .env.production

# Rebuild and redeploy
npm run build
[your deployment command]
```

**Post-Enable Verification**
- [ ] Test write operations work
- [ ] Verify changes save correctly
- [ ] Check regular users still unaffected
- [ ] Monitor for any errors
- [ ] Verify performance acceptable

## Post-Deployment Monitoring

### Day 1
- [ ] Monitor error logs every 2 hours
- [ ] Check user reports for issues
- [ ] Verify swarm performance unchanged
- [ ] Check database query performance
- [ ] Monitor API response times

### Week 1
- [ ] Review accumulated performance metrics
- [ ] Check token usage tracking accuracy
- [ ] Verify no memory leaks
- [ ] Analyze any user-reported issues
- [ ] Document any discovered edge cases

### Week 2+
- [ ] Review agent optimization impact
- [ ] Check cost savings from optimization
- [ ] Measure latency improvements
- [ ] Gather admin feedback
- [ ] Plan next optimizations

## Rollback Plan

### If Issues Occur in Staging
1. **Revert Environment Variable**
   ```bash
   echo "VITE_ADMIN_ENHANCED_WRITE_ENABLED=false" >> .env.staging
   npm run build
   [redeploy]
   ```

2. **Fix Issues**
   - Identify root cause
   - Fix code or migration
   - Test locally
   - Re-deploy to staging

### If Issues Occur in Production

**Minor Issues (UI bugs, non-critical)**
1. Set `VITE_ADMIN_ENHANCED_WRITE_ENABLED=false`
2. Redeploy application
3. Fix issues in staging
4. Re-enable when fixed

**Major Issues (data corruption, errors)**
1. **Immediate**: Set WRITE_ENABLED to false
2. **Database**: Restore from backup if needed
3. **Application**: Rollback to previous version
4. **Investigation**: Identify and fix root cause
5. **Testing**: Extensive staging testing before retry

## Success Criteria

Deployment is successful when:

✅ **Migration Applied**
- [ ] All tables created successfully
- [ ] All columns added without errors
- [ ] RLS policies active and tested
- [ ] Helper functions working

✅ **UI Functional**
- [ ] Admin can access all pages
- [ ] Agent list displays correctly
- [ ] Agent editor works (all tabs)
- [ ] Performance metrics display
- [ ] Write operations work (when enabled)

✅ **Zero User Impact**
- [ ] Regular users see no changes
- [ ] Chat functionality unchanged
- [ ] Voice functionality unchanged
- [ ] No new errors for users
- [ ] Performance not degraded

✅ **Performance Acceptable**
- [ ] Page loads < 2 seconds
- [ ] Agent list renders quickly
- [ ] Database queries efficient
- [ ] No memory leaks detected

✅ **Security Verified**
- [ ] Non-admins cannot access
- [ ] RLS policies enforced
- [ ] Write protection works
- [ ] Audit trail captured

## Common Issues & Solutions

### Issue: Migration Fails
**Solution**: Check for conflicts with existing tables/columns
```sql
-- Check if columns already exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'agent_prompts';
```

### Issue: RLS Blocks Admin Access
**Solution**: Verify admin role in profiles table
```sql
SELECT user_id, role FROM profiles WHERE role = 'admin';
```

### Issue: Performance Metrics Don't Display
**Solution**: Ensure helper functions were created
```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%agent%';
```

### Issue: Write Buttons Disabled
**Solution**: Check environment variable
```bash
echo $VITE_ADMIN_ENHANCED_WRITE_ENABLED
# Should be "true" in staging, "false" initially in production
```

### Issue: Pat's Voice Agent Not Found
**Solution**: Check if migration seed data ran
```sql
SELECT * FROM agent_prompts WHERE agent_id = 'pat-voice-personality';
```

## Support Contacts

**Technical Issues**: [Your Team Contact]
**Database Issues**: [DBA Contact]
**Deployment Issues**: [DevOps Contact]
**User Issues**: [Support Team Contact]

## Documentation Links

- [Implementation Summary](./AGENT_CONFIGURATION_SYSTEM_IMPLEMENTATION.md)
- [Optimization Guide](./SWARM_OPTIMIZATION_GUIDE.md)
- [Migration File](./supabase/migrations/20251021000000_comprehensive_agent_configuration_system.sql)

---

**Last Updated**: 2025-10-21
**Version**: 1.0
**Status**: Ready for Staging Deployment
