# Swarm Rebuild Phase 0: Infrastructure Complete

**Status**: ✅ P0 Foundation Ready for Testing
**Date**: 2025-10-16
**Next Phase**: P1 (Admin UI Configuration)

---

## What Was Built

### 1. **Data Contracts** (`src/types/swarm.ts`)
- `ResponseObject` - Standard output format for all swarm agents
- `MemoryRow` - Three-tier memory storage with conflict resolution
- `FilterResult` - Dietary filter annotations and substitutions
- `SwarmManifest` - Version-controlled swarm configuration
- `DietaryPreferences` - User diet preferences with macro overrides

**Key Design Decisions:**
- `protected_fields` array prevents LLM mutation of numeric values
- `conflict_priority` enables newer explicit > older explicit > inferred resolution
- Embeddings dimension locked to 1536 (OpenAI text-embedding-3-small compatible)

### 2. **Database Schema** (`supabase/migrations/20251016000000_swarm_rebuild_p0_infrastructure.sql`)

**Tables Created:**
- `user_memory` - Tiered memory with confidence scoring and TTL
- `chat_summaries_v2` - Enhanced summaries with topics and vector embeddings
- `dietary_filter_rules` - Admin-configurable filter logic
- `swarm_versions` - Draft/publish workflow for swarms
- `agent_test_runs` - Test execution history with telemetry
- `swarm_telemetry` - Performance tracking per agent/swarm

**Extensions Enabled:**
- `vector` - For semantic similarity search on chat summaries
- `pg_cron` - For automated memory decay and TTL expiration
- `pgcrypto` - For UUID generation

**Indexes Created:**
- B-tree indexes on `user_id`, `created_at`, `topics` for fast lookups
- IVFFlat index on `embedding` column for cosine similarity search (lists=100)
- GIN indexes on JSONB columns and array columns

**RLS Policies:**
- User-scoped access for `user_memory`, `chat_summaries_v2`, `swarm_telemetry`
- Admin-only access for `swarm_versions`, `dietary_filter_rules`
- Beta/Admin access for `agent_test_runs`

**Automated Jobs:**
- Daily cron job at 2 AM UTC runs `decay_short_term_memories()`
  - Reduces confidence by 5% per day for short-term memories
  - Deletes ephemeral memories past TTL
  - Removes short-term memories below 0.1 confidence

**Functions Created:**
- `decay_short_term_memories()` - Automated confidence decay
- `resolve_memory_conflict()` - Conflict resolution with priority rules

**Rollback Migration:**
- `20251016000000_swarm_rebuild_p0_infrastructure_down.sql` - Complete reversibility

### 3. **Response Renderer** (`src/core/swarm/renderer.ts`)

**Components:**
- `PresenterRegistry` - Maps swarm types to formatting functions
- `ResponseRenderer.compose()` - Composes multiple ResponseObjects
- `validateProtectedFields()` - Ensures numeric integrity
- Default presenters for: nutrition, workout, general, kpi, mmb

**Pipeline Flow:**
```
[Domain Swarm] → ResponseObject
      ↓
[Filter Phase] → Annotate (read-only)
      ↓
[Domain Presenter] → Formatted Text
      ↓
[Response Renderer] → Compose + Issues + Followups
      ↓
[Persona Tone] → Final Output (optional)
```

**Protected Fields Enforcement:**
- Original payload cached before presenter
- Validation before and after render
- Errors logged if mutations detected

### 4. **Feature Flag System** (`src/lib/featureFlags.v2.ts`)

**Flags Defined:**
- `SWARM_V2_ENABLED` - New swarm architecture
- `RESPONSE_RENDERER_ENABLED` - Response pipeline
- `DIETARY_FILTERS_ENABLED` - All dietary filters
- `MEMORY_SYSTEM_ENABLED` - Memory tier system
- `MEMORY_UI_ENABLED` - User-facing memory manager
- `ADMIN_PROMPT_EDITOR_ENABLED` - Admin editing
- `SWARM_TELEMETRY_ENABLED` - Performance tracking
- Individual filter flags: `FILTER_KETO`, `FILTER_LOW_CARB`, etc.

**Capabilities:**
- Role-based gating (admin, beta, paid, all)
- Percentage rollout with deterministic user hashing
- Per-user overrides
- Runtime enable/disable without deployment

### 5. **Memory Service** (`src/lib/memory.ts`)

**Core Methods:**
- `create()` - Store new memory with tier and confidence
- `upsertWithConflictResolution()` - Uses RPC for conflict handling
- `query()` - Retrieve by user, tier, topics, confidence
- `getByKey()` - Fetch highest-priority memory for key
- `update()` - Modify confidence, topics, tier
- `delete()` / `deleteAllForUser()` - Deletion with audit trail
- `promoteToLongTerm()` - User confirmation upgrade
- `exportForUser()` - GDPR compliance export
- `retrieveRelevant()` - Scored retrieval for context injection

**Relevance Scoring:**
```
score = (topicMatch * 0.4) +
        (recency * 0.3) +
        (confidence * 0.2) +
        (tierScore * 0.1)
```

---

## Schema Enhancements to `user_preferences`

**New Columns Added:**
- `diet_type` - Enum: balanced, keto, low_carb, carnivore, vegetarian, vegan
- `macro_overrides` - JSONB with optional protein_g, carbs_g, fat_g, fiber_g
- `allergens` - Text array for allergen filtering
- `religious_restrictions` - Text array: halal, kosher, none
- `persona_override` - Boolean flag to bypass dietary framing

**Backward Compatibility:**
- All columns nullable with sensible defaults
- Existing users get `diet_type = 'balanced'`
- Migration safely adds columns with `IF NOT EXISTS`

---

## Seeded Filter Rules

**Keto Filter:**
- Condition: `carbs_g > 10`
- Annotation: "High carb alert: {item} contains {carbs_g}g carbs (limit: 10g for keto)"
- Substitutions: rice → cauliflower rice, pasta → zucchini noodles

**Low-Carb Filter:**
- Condition: `carbs_g > 20`
- Annotation: "Moderate carb: {item} has {carbs_g}g carbs (low-carb threshold: 20g)"
- Substitutions: bread → low-carb bread, potato → sweet potato (smaller portion)

**Carnivore Filter:**
- Condition: `category IN ['plant', 'vegetable', 'fruit', 'grain']`
- Annotation: "Plant-based item: {item} (carnivore diet focuses on animal products)"
- Substitutions: lettuce → beef, apple → cheese

---

## What's Next: P1 (Admin UI)

### Required Before Production:
1. **Admin Prompt Editor**
   - Inline editing with syntax highlighting
   - Model selector per agent (OpenAI, Anthropic, Gemini, DeepSeek)
   - Drag-and-drop agent reordering

2. **Draft/Publish Workflow**
   - Version comparison diff viewer
   - Rollout percentage slider
   - Target audience selector

3. **Test Runner**
   - Execute swarms on sample inputs
   - Display ResponseObject, filter annotations, presenter output
   - Performance metrics per agent

4. **Swarm Manifest Editor**
   - Phase assignment UI
   - IO mapping visualization
   - Enable/disable toggles per agent

### Implementation Order:
```
P1.1: Extend SwarmsPage with prompt editor
P1.2: Add version diff viewer
P1.3: Build test runner modal
P1.4: Create manifest editor
```

---

## Testing Checklist

### Database
- [ ] Run migration: `supabase migration up`
- [ ] Verify tables created: `SELECT * FROM user_memory LIMIT 1;`
- [ ] Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'user_memory';`
- [ ] Confirm cron job: `SELECT * FROM cron.job WHERE jobname = 'decay-memories';`

### Feature Flags
- [ ] Test role-based gating with admin user
- [ ] Verify percentage rollout with multiple users
- [ ] Confirm flags default to disabled

### Memory Service
- [ ] Create ephemeral memory with TTL
- [ ] Test conflict resolution (explicit > inferred)
- [ ] Verify relevance scoring with topic match
- [ ] Export memories for GDPR compliance

### Response Renderer
- [ ] Register custom presenter
- [ ] Compose multiple ResponseObjects
- [ ] Validate protected fields enforcement
- [ ] Test persona tone application

---

## Questions Resolved

**Q: Should memory use embeddings for semantic similarity?**
A: Yes. Schema includes `embedding vector(1536)` column with IVFFlat index. P3 will implement embedding generation via OpenAI API.

**Q: A/B testing granularity?**
A: All levels supported:
- Entire swarm variants via `swarm_versions.rollout_percentage`
- Individual agent versions via `agents.current_version_id`
- Specific prompt variations via `agent_versions.config`

**Q: Dietary filters opt-in or opt-out?**
A: Opt-in via `user_preferences.diet_type`. Defaults to 'balanced' (no filtering). Users explicitly select keto/carnivore/etc. to enable filters.

---

## Safety & Rollback

**Feature Flags Protect Production:**
- All new features disabled by default
- Admin/beta roles required for testing
- Runtime toggle without redeployment

**Database Rollback:**
```sql
-- Execute down migration
\i supabase/migrations/20251016000000_swarm_rebuild_p0_infrastructure_down.sql
```

**Code Rollback:**
- Old swarm system (`src/orchestrator/router.ts`) untouched
- New code paths gated behind `SWARM_V2_ENABLED` flag
- Zero impact to production until flag enabled

---

## Performance Targets

**Memory Retrieval:**
- `retrieveRelevant()` < 50ms for 5 memories
- IVFFlat index enables <100ms embedding search

**Filter Agents:**
- Annotation phase < 50ms (no LLM calls)
- Pure JavaScript logic for rule evaluation

**Response Rendering:**
- `compose()` < 10ms for 3 ResponseObjects
- Template-based formatters (no LLM)

**Telemetry Overhead:**
- < 5ms per agent execution
- Async insert to `swarm_telemetry`

---

## Documentation Created

1. **This File** - P0 implementation summary
2. **Migration Comments** - Inline SQL documentation
3. **Type Definitions** - JSDoc comments in `src/types/swarm.ts`
4. **Service Methods** - Docstrings in `src/lib/memory.ts`

**Still Needed for P1:**
- Admin user guide with screenshots
- Swarm development guide (ResponseObject contracts)
- Filter development guide (annotation schemas)

---

## Critical Notes

1. **RLS Policies Are Restrictive by Default**
   - Users can ONLY access their own memories
   - Admins have separate policies for config tables
   - No `USING (true)` policies exist

2. **Protected Fields Enforced End-to-End**
   - Validated before presenter
   - Validated after renderer
   - Errors logged if mutations detected

3. **Memory Conflicts Use Priority Rules**
   - Explicit (2) > Inferred (1) > System (0)
   - Newer explicit beats older explicit after 7 days
   - User prompted to update on contradiction

4. **Embeddings Ready But Not Generated**
   - Column exists, index created
   - P3 will add OpenAI embedding API calls
   - Similarity search works once embeddings populated

5. **Cron Job Runs Automatically**
   - No manual intervention needed
   - Logs to Postgres logs
   - Can be monitored via `cron.job_run_details`

---

## Stakeholder Sign-Off Required

Before proceeding to P1:
- [ ] Database schema approved by DBA
- [ ] Feature flag strategy approved by product
- [ ] Memory tier governance approved by legal (GDPR compliance)
- [ ] Performance targets validated by infra team

---

**End of P0 Handoff**

Ready to proceed to P1: Admin UI Configuration when approved.
