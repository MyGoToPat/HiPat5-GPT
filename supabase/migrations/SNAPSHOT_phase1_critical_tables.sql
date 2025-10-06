/*
  # SNAPSHOT: Phase 1 Critical Tables and Functions

  This file contains a backup snapshot of critical database objects
  after Phase 1 migration. Use this to verify state or restore if needed.

  Date: 2025-10-06
  Migration: fix_session_type_constraint_and_create_macros_table
*/

-- ============================================================================
-- CHAT_SESSIONS STRUCTURE
-- ============================================================================

/*
Table: public.chat_sessions
Columns:
  - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  - user_id uuid NOT NULL
  - started_at timestamptz NOT NULL
  - ended_at timestamptz
  - active boolean NOT NULL DEFAULT true
  - session_type text NOT NULL DEFAULT 'general'
  - metadata jsonb DEFAULT '{}'::jsonb
  - created_at timestamptz NOT NULL DEFAULT now()

Constraints:
  - chat_sessions_session_type_check: CHECK (session_type IN ('general', 'tmwya', 'workout', 'mmb'))

Indexes:
  - Primary key on id
  - Foreign key user_id references auth.users
*/

-- ============================================================================
-- CHAT_MESSAGES STRUCTURE
-- ============================================================================

/*
Table: public.chat_messages
Key Columns:
  - id uuid PRIMARY KEY
  - session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE
  - user_id uuid NOT NULL
  - role text NOT NULL
  - content text NOT NULL
  - metadata jsonb DEFAULT '{}'::jsonb
  - timestamp timestamptz NOT NULL DEFAULT now()

Constraints:
  - fk_chat_messages_session: Foreign key to chat_sessions

Indexes:
  - idx_chat_messages_session_id ON (session_id)
*/

-- ============================================================================
-- CHAT_MESSAGE_MACROS STRUCTURE
-- ============================================================================

/*
Table: public.chat_message_macros
Columns:
  - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  - message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE
  - session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE
  - items jsonb NOT NULL DEFAULT '[]'::jsonb
  - totals jsonb NOT NULL DEFAULT '{}'::jsonb
  - basis text NOT NULL DEFAULT 'cooked'
  - consumed boolean NOT NULL DEFAULT false
  - created_at timestamptz NOT NULL DEFAULT now()
  - updated_at timestamptz NOT NULL DEFAULT now()

Indexes:
  - idx_cmm_session_time ON (session_id, created_at DESC)
  - idx_cmm_message ON (message_id)
  - idx_cmm_consumed ON (session_id, consumed, created_at DESC) WHERE consumed = false

RLS Policies:
  - "Users can read own macro data" FOR SELECT
  - "Users can insert own macro data" FOR INSERT
  - "Users can update own macro data" FOR UPDATE
*/

-- ============================================================================
-- FOOD_UNITS STRUCTURE
-- ============================================================================

/*
Table: public.food_units
Columns:
  - id uuid PRIMARY KEY DEFAULT gen_random_uuid()
  - food_key text NOT NULL
  - display_name text NOT NULL
  - unit_label text NOT NULL
  - grams_per_unit numeric NOT NULL
  - basis text NOT NULL CHECK (basis IN ('cooked','raw','as-served'))
  - brand text
  - source text DEFAULT 'curated'
  - updated_at timestamptz NOT NULL DEFAULT now()

Indexes:
  - idx_food_units_key ON (food_key)
  - idx_food_units_key_unit ON (food_key, unit_label, basis)
*/

-- ============================================================================
-- CRITICAL RPC FUNCTIONS
-- ============================================================================

-- Function: get_or_create_active_session(p_user_id uuid)
-- Returns: TABLE (id, user_id, started_at, ended_at, active, session_type, metadata, created_at)
-- Behavior: Returns active session (any type) or creates new 'general' session

-- Function: mark_macro_payload_consumed(p_message_id uuid, p_user_id uuid)
-- Returns: boolean
-- Behavior: Marks macro payload as consumed, returns true if successful

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check session_type constraint
SELECT conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'chat_sessions' AND conname LIKE '%session_type%';

-- Verify chat_message_macros table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'chat_message_macros'
);

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'chat_message_macros';

-- Count RLS policies
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'chat_message_macros';

-- ============================================================================
-- RESTORATION NOTES
-- ============================================================================

/*
To restore from this snapshot:
1. Review current database state
2. Compare with this snapshot structure
3. If needed, apply rollback migration: rollback_session_type_and_macros
4. To completely restore, drop and recreate tables matching this structure
5. Restore data from backups if available

Key relationships:
- chat_sessions → chat_messages (1:many)
- chat_messages → chat_message_macros (1:1 or 1:0)
- All cascade on delete from parent

Session types after Phase 1:
- 'general': Default chat sessions
- 'tmwya': Tell Me What You Ate focused sessions
- 'workout': Workout-related sessions
- 'mmb': Meal-by-meal tracking sessions
*/
