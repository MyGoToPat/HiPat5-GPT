/*
  # HiPat 5.0 GPT Complete Database Schema

  This migration creates the complete database schema for HiPat 5.0 GPT application.

  ## New Tables
  1. **profiles** - User profile information with role-based access
  2. **user_metrics** - Calculated health metrics (BMR, TDEE, macros)
  3. **chat_histories** - Chat conversation metadata
  4. **chat_messages** - Individual chat messages
  5. **food_logs** - User food intake tracking
  6. **timer_presets** - Interval timer configurations
  7. **timer_intervals** - Individual intervals within timer presets
  8. **trainer_client_relationships** - Links trainers to their clients
  9. **trainer_notes** - Private trainer notes about clients
  10. **client_invites** - Trainer invitation management
  11. **agent_configs** - AI agent configuration per client
  12. **workout_plans** - Client workout routines
  13. **exercises** - Individual exercises within workout plans
  14. **pt_directives** - Automated Pat AI interaction instructions
  15. **permission_settings** - Data access permissions between trainers/clients
  16. **permission_audit_log** - Audit trail for permission changes

  ## Helper Functions
  1. **get_user_role()** - Gets current user's role from profiles
  2. **is_trainer_of()** - Checks if current user is trainer of specified client
  3. **update_timestamp()** - Generic trigger function for updated_at columns
  4. **handle_new_user()** - Auto-creates profile for new auth users
  5. **update_chat_history_last_message_at()** - Updates chat metadata on message changes
  6. **recalculate_preset_total_duration()** - Recalculates timer preset duration

  ## Security
  - Enable RLS on all tables
  - Comprehensive policies for user, trainer, and admin access
  - Permission-based access control for trainer-client relationships
  - Audit logging for sensitive permission changes

  ## Triggers
  - Auto-profile creation on user signup
  - Timestamp management for updated_at columns
  - Chat metadata synchronization
  - Timer preset duration recalculation
*/

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function: Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Function: Check if current user is trainer of specified client
CREATE OR REPLACE FUNCTION is_trainer_of(client_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainer_client_relationships 
    WHERE trainer_id = auth.uid() 
    AND client_id = is_trainer_of.client_id 
    AND status = 'active'
  );
$$;

-- Function: Generic timestamp updater
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: Handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, beta_user, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    FALSE,
    'free_user'
  );
  RETURN NEW;
END;
$$;

-- Function: Update chat history timestamp
CREATE OR REPLACE FUNCTION update_chat_history_last_message_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.chat_histories 
    SET last_message_at = now() 
    WHERE id = OLD.chat_history_id;
    RETURN OLD;
  ELSE
    UPDATE public.chat_histories 
    SET last_message_at = now() 
    WHERE id = NEW.chat_history_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Function: Recalculate timer preset total duration
CREATE OR REPLACE FUNCTION recalculate_preset_total_duration()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  preset_id_to_update uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    preset_id_to_update := OLD.preset_id;
  ELSE
    preset_id_to_update := NEW.preset_id;
  END IF;
  
  UPDATE public.timer_presets 
  SET total_duration = (
    SELECT COALESCE(SUM(duration), 0) * cycles 
    FROM public.timer_intervals 
    JOIN public.timer_presets ON timer_presets.id = timer_intervals.preset_id
    WHERE preset_id = preset_id_to_update
  )
  WHERE id = preset_id_to_update;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  location text,
  dob date,
  bio text,
  beta_user boolean DEFAULT FALSE NOT NULL,
  role text DEFAULT 'free_user' NOT NULL CHECK (role IN ('free_user', 'admin', 'trainer')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: user_metrics
CREATE TABLE IF NOT EXISTS public.user_metrics (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bmr integer,
  tdee integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: chat_histories
CREATE TABLE IF NOT EXISTS public.chat_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_message_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_history_id uuid NOT NULL REFERENCES public.chat_histories(id) ON DELETE CASCADE,
  text text NOT NULL,
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  is_user boolean NOT NULL
);

-- Table: food_logs
CREATE TABLE IF NOT EXISTS public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  grams numeric NOT NULL CHECK (grams > 0),
  source_db text,
  macros jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1)
);

-- Table: timer_presets
CREATE TABLE IF NOT EXISTS public.timer_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cycles integer DEFAULT 1 NOT NULL CHECK (cycles > 0),
  total_duration integer NOT NULL CHECK (total_duration >= 0),
  is_built_in boolean DEFAULT FALSE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_used timestamp with time zone
);

-- Table: timer_intervals
CREATE TABLE IF NOT EXISTS public.timer_intervals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES public.timer_presets(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration integer NOT NULL CHECK (duration > 0),
  type text NOT NULL CHECK (type IN ('work', 'rest', 'warm', 'cool')),
  audio_cue text CHECK (audio_cue IN ('beep', 'bell', 'start', 'end', 'none')),
  voice_announcement text
);

-- Table: trainer_client_relationships
CREATE TABLE IF NOT EXISTS public.trainer_client_relationships (
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'pending')),
  PRIMARY KEY (trainer_id, client_id),
  CONSTRAINT unique_client_trainer UNIQUE (client_id)
);

-- Table: trainer_notes
CREATE TABLE IF NOT EXISTS public.trainer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  author_name text
);

-- Table: client_invites
CREATE TABLE IF NOT EXISTS public.client_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  sent_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  reminders_sent integer DEFAULT 0 NOT NULL CHECK (reminders_sent >= 0),
  invite_code text UNIQUE NOT NULL
);

-- Table: agent_configs
CREATE TABLE IF NOT EXISTS public.agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  assigned boolean DEFAULT FALSE NOT NULL,
  tone text CHECK (tone IN ('professional', 'friendly', 'casual', 'motivational', 'analytical')),
  strictness integer CHECK (strictness >= 1 AND strictness <= 10),
  data_permissions jsonb,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT unique_client_agent UNIQUE (client_id, agent_id)
);

-- Table: workout_plans
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('strength', 'cardio', 'hybrid', 'recovery')),
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration integer CHECK (estimated_duration > 0),
  is_active boolean DEFAULT TRUE NOT NULL,
  is_template boolean DEFAULT FALSE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_used timestamp with time zone,
  completion_rate numeric CHECK (completion_rate >= 0 AND completion_rate <= 100),
  assigned_days text[],
  total_sessions integer DEFAULT 0 NOT NULL CHECK (total_sessions >= 0),
  avg_rating numeric CHECK (avg_rating >= 0 AND avg_rating <= 5),
  last_modified timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: exercises
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  sets integer NOT NULL CHECK (sets > 0),
  reps text NOT NULL,
  weight text,
  rest_time integer CHECK (rest_time >= 0),
  notes text,
  muscle_groups text[],
  equipment text[]
);

-- Table: pt_directives
CREATE TABLE IF NOT EXISTS public.pt_directives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('nutrition', 'workout', 'recovery', 'motivation', 'general')),
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'workout_days', 'rest_days', 'as_needed')),
  triggers text[],
  pat_instructions text NOT NULL,
  is_active boolean DEFAULT TRUE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_triggered timestamp with time zone,
  trigger_count integer DEFAULT 0 NOT NULL CHECK (trigger_count >= 0),
  effectiveness numeric CHECK (effectiveness >= 0 AND effectiveness <= 100)
);

-- Table: permission_settings
CREATE TABLE IF NOT EXISTS public.permission_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain text NOT NULL,
  level text NOT NULL CHECK (level IN ('none', 'read', 'edit', 'full')),
  sub_permissions jsonb,
  last_changed timestamp with time zone DEFAULT now() NOT NULL,
  changed_by text NOT NULL CHECK (changed_by IN ('client', 'trainer')),
  CONSTRAINT unique_client_domain UNIQUE (client_id, domain)
);

-- Table: permission_audit_log
CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain text NOT NULL,
  action text NOT NULL CHECK (action IN ('granted', 'revoked', 'modified')),
  previous_level text CHECK (previous_level IN ('none', 'read', 'edit', 'full')),
  new_level text CHECK (new_level IN ('none', 'read', 'edit', 'full')),
  timestamp timestamp with time zone DEFAULT now() NOT NULL,
  changed_by text NOT NULL CHECK (changed_by IN ('client', 'trainer')),
  reason text
);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timer_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timer_intervals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_client_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Profiles policies
CREATE POLICY "Users can read own profile, trainers can read assigned clients, admins read all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(id))
  );

CREATE POLICY "Users can insert own profile, admins can insert any"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = id) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Users can update own profile, trainers can update assigned clients, admins update all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(id))
  );

CREATE POLICY "Only admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- User metrics policies
CREATE POLICY "Users can read own metrics, trainers can read assigned clients, admins read all"
  ON public.user_metrics FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(user_id))
  );

CREATE POLICY "Users can insert own metrics, admins can insert any"
  ON public.user_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Users can update own metrics, trainers can update assigned clients, admins update all"
  ON public.user_metrics FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(user_id))
  );

CREATE POLICY "Only admins can delete metrics"
  ON public.user_metrics FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Chat histories policies
CREATE POLICY "Users can read own chats, trainers can read assigned clients, admins read all"
  ON public.chat_histories FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(user_id))
  );

CREATE POLICY "Users can insert own chats, admins can insert any"
  ON public.chat_histories FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Users can update own chats, trainers can update assigned clients, admins update all"
  ON public.chat_histories FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(user_id))
  );

CREATE POLICY "Only admins can delete chat histories"
  ON public.chat_histories FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Chat messages policies
CREATE POLICY "Users can read messages from own chats, trainers can read assigned clients, admins read all"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_histories 
      WHERE chat_histories.id = chat_messages.chat_history_id 
      AND (
        chat_histories.user_id = auth.uid() OR 
        get_user_role() = 'admin' OR 
        (get_user_role() = 'trainer' AND is_trainer_of(chat_histories.user_id))
      )
    )
  );

CREATE POLICY "Users can insert messages to own chats, admins can insert any"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_histories 
      WHERE chat_histories.id = chat_messages.chat_history_id 
      AND (
        chat_histories.user_id = auth.uid() OR 
        get_user_role() = 'admin'
      )
    )
  );

CREATE POLICY "Users can update messages in own chats, admins can update any"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_histories 
      WHERE chat_histories.id = chat_messages.chat_history_id 
      AND (
        chat_histories.user_id = auth.uid() OR 
        get_user_role() = 'admin'
      )
    )
  );

CREATE POLICY "Only admins can delete chat messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Food logs policies
CREATE POLICY "Users can read own food logs, trainers can read assigned clients, admins read all"
  ON public.food_logs FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(user_id))
  );

CREATE POLICY "Users can insert own food logs, admins can insert any"
  ON public.food_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Users can update own food logs, admins can update any"
  ON public.food_logs FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Only admins can delete food logs"
  ON public.food_logs FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Timer presets policies
CREATE POLICY "All can read built-in presets, users can read own presets, trainers can read assigned clients, admins read all"
  ON public.timer_presets FOR SELECT
  TO authenticated
  USING (
    (is_built_in = TRUE) OR 
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(user_id))
  );

CREATE POLICY "Users can insert own presets, admins can insert any"
  ON public.timer_presets FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Users can update own presets, admins can update any"
  ON public.timer_presets FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Users can delete own presets, admins can delete any"
  ON public.timer_presets FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (get_user_role() = 'admin')
  );

-- Timer intervals policies
CREATE POLICY "Users can read intervals from accessible presets"
  ON public.timer_intervals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.timer_presets 
      WHERE timer_presets.id = timer_intervals.preset_id 
      AND (
        timer_presets.is_built_in = TRUE OR 
        timer_presets.user_id = auth.uid() OR 
        get_user_role() = 'admin' OR 
        (get_user_role() = 'trainer' AND is_trainer_of(timer_presets.user_id))
      )
    )
  );

CREATE POLICY "Users can insert intervals to own presets, admins can insert any"
  ON public.timer_intervals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.timer_presets 
      WHERE timer_presets.id = timer_intervals.preset_id 
      AND (
        timer_presets.user_id = auth.uid() OR 
        get_user_role() = 'admin'
      )
    )
  );

CREATE POLICY "Users can update intervals in own presets, admins can update any"
  ON public.timer_intervals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.timer_presets 
      WHERE timer_presets.id = timer_intervals.preset_id 
      AND (
        timer_presets.user_id = auth.uid() OR 
        get_user_role() = 'admin'
      )
    )
  );

CREATE POLICY "Users can delete intervals from own presets, admins can delete any"
  ON public.timer_intervals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.timer_presets 
      WHERE timer_presets.id = timer_intervals.preset_id 
      AND (
        timer_presets.user_id = auth.uid() OR 
        get_user_role() = 'admin'
      )
    )
  );

-- Trainer client relationships policies
CREATE POLICY "Trainers, clients, and admins can read relationships"
  ON public.trainer_client_relationships FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = trainer_id) OR 
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers and admins can create relationships"
  ON public.trainer_client_relationships FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = trainer_id AND get_user_role() = 'trainer') OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers and admins can update relationships"
  ON public.trainer_client_relationships FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = trainer_id AND get_user_role() = 'trainer') OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers and admins can delete relationships"
  ON public.trainer_client_relationships FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = trainer_id AND get_user_role() = 'trainer') OR 
    (get_user_role() = 'admin')
  );

-- Trainer notes policies
CREATE POLICY "Trainers can read own notes, admins can read all"
  ON public.trainer_notes FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = trainer_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Trainers can insert notes for assigned clients, admins can insert any"
  ON public.trainer_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = trainer_id AND get_user_role() = 'trainer') OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers can update own notes, admins can update any"
  ON public.trainer_notes FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = trainer_id AND get_user_role() = 'trainer') OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers can delete own notes, admins can delete any"
  ON public.trainer_notes FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = trainer_id AND get_user_role() = 'trainer') OR 
    (get_user_role() = 'admin')
  );

-- Client invites policies
CREATE POLICY "Trainers can read own invites, admins can read all"
  ON public.client_invites FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = trainer_id) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers can send invites, admins can send any"
  ON public.client_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = trainer_id AND get_user_role() = 'trainer') OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers can update own invites, admins can update any"
  ON public.client_invites FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = trainer_id AND get_user_role() = 'trainer') OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers can delete own invites, admins can delete any"
  ON public.client_invites FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = trainer_id AND get_user_role() = 'trainer') OR 
    (get_user_role() = 'admin')
  );

-- Agent configs policies
CREATE POLICY "Clients can read own configs, trainers can read assigned clients, admins read all"
  ON public.agent_configs FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Clients and trainers can insert configs for assigned clients, admins can insert any"
  ON public.agent_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Clients and trainers can update configs for assigned clients, admins can update any"
  ON public.agent_configs FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Only admins can delete agent configs"
  ON public.agent_configs FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Workout plans policies
CREATE POLICY "Clients can read own plans, trainers can read assigned clients, admins read all"
  ON public.workout_plans FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Clients and trainers can insert plans for assigned clients, admins can insert any"
  ON public.workout_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Clients and trainers can update plans for assigned clients, admins can update any"
  ON public.workout_plans FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Clients and trainers can delete plans for assigned clients, admins can delete any"
  ON public.workout_plans FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

-- Exercises policies
CREATE POLICY "Users can read exercises from accessible plans"
  ON public.exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans 
      WHERE workout_plans.id = exercises.workout_plan_id 
      AND (
        workout_plans.client_id = auth.uid() OR 
        get_user_role() = 'admin' OR 
        (get_user_role() = 'trainer' AND is_trainer_of(workout_plans.client_id))
      )
    )
  );

CREATE POLICY "Users can insert exercises to accessible plans"
  ON public.exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans 
      WHERE workout_plans.id = exercises.workout_plan_id 
      AND (
        workout_plans.client_id = auth.uid() OR 
        get_user_role() = 'admin' OR 
        (get_user_role() = 'trainer' AND is_trainer_of(workout_plans.client_id))
      )
    )
  );

CREATE POLICY "Users can update exercises in accessible plans"
  ON public.exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans 
      WHERE workout_plans.id = exercises.workout_plan_id 
      AND (
        workout_plans.client_id = auth.uid() OR 
        get_user_role() = 'admin' OR 
        (get_user_role() = 'trainer' AND is_trainer_of(workout_plans.client_id))
      )
    )
  );

CREATE POLICY "Users can delete exercises from accessible plans"
  ON public.exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans 
      WHERE workout_plans.id = exercises.workout_plan_id 
      AND (
        workout_plans.client_id = auth.uid() OR 
        get_user_role() = 'admin' OR 
        (get_user_role() = 'trainer' AND is_trainer_of(workout_plans.client_id))
      )
    )
  );

-- PT directives policies
CREATE POLICY "Clients can read own directives, trainers can read assigned clients, admins read all"
  ON public.pt_directives FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Trainers can insert directives for assigned clients, admins can insert any"
  ON public.pt_directives FOR INSERT
  TO authenticated
  WITH CHECK (
    (get_user_role() = 'trainer' AND is_trainer_of(client_id)) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers can update directives for assigned clients, admins can update any"
  ON public.pt_directives FOR UPDATE
  TO authenticated
  USING (
    (get_user_role() = 'trainer' AND is_trainer_of(client_id)) OR 
    (get_user_role() = 'admin')
  );

CREATE POLICY "Trainers can delete directives for assigned clients, admins can delete any"
  ON public.pt_directives FOR DELETE
  TO authenticated
  USING (
    (get_user_role() = 'trainer' AND is_trainer_of(client_id)) OR 
    (get_user_role() = 'admin')
  );

-- Permission settings policies
CREATE POLICY "Clients can read own permissions, trainers can read assigned clients, admins read all"
  ON public.permission_settings FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Clients and trainers can insert permissions for assigned clients, admins can insert any"
  ON public.permission_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Clients and trainers can update permissions for assigned clients, admins can update any"
  ON public.permission_settings FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Only admins can delete permission settings"
  ON public.permission_settings FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- Permission audit log policies
CREATE POLICY "Clients can read own audit logs, trainers can read assigned clients, admins read all"
  ON public.permission_audit_log FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Clients and trainers can insert audit logs for assigned clients, admins can insert any"
  ON public.permission_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = client_id) OR 
    (get_user_role() = 'admin') OR 
    (get_user_role() = 'trainer' AND is_trainer_of(client_id))
  );

CREATE POLICY "Audit logs are immutable - no updates allowed"
  ON public.permission_audit_log FOR UPDATE
  TO authenticated
  USING (FALSE);

CREATE POLICY "Only admins can delete audit logs"
  ON public.permission_audit_log FOR DELETE
  TO authenticated
  USING (get_user_role() = 'admin');

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger: Auto-create profile on user signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
  END IF;
END $$;

-- Trigger: Update profiles.updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_profiles_updated_at'
  ) THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  END IF;
END $$;

-- Trigger: Update user_metrics.updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_user_metrics_updated_at'
  ) THEN
    CREATE TRIGGER set_user_metrics_updated_at
      BEFORE UPDATE ON public.user_metrics
      FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  END IF;
END $$;

-- Trigger: Update agent_configs.updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_agent_configs_updated_at'
  ) THEN
    CREATE TRIGGER set_agent_configs_updated_at
      BEFORE UPDATE ON public.agent_configs
      FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  END IF;
END $$;

-- Trigger: Update workout_plans.last_modified
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_workout_plans_last_modified'
  ) THEN
    CREATE TRIGGER set_workout_plans_last_modified
      BEFORE UPDATE ON public.workout_plans
      FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  END IF;
END $$;

-- Trigger: Update chat history on message changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_chat_history_on_message_change'
  ) THEN
    CREATE TRIGGER update_chat_history_on_message_change
      AFTER INSERT OR UPDATE OR DELETE ON public.chat_messages
      FOR EACH ROW EXECUTE PROCEDURE update_chat_history_last_message_at();
  END IF;
END $$;

-- Trigger: Recalculate timer preset duration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'recalculate_preset_duration_on_interval_change'
  ) THEN
    CREATE TRIGGER recalculate_preset_duration_on_interval_change
      AFTER INSERT OR UPDATE OR DELETE ON public.timer_intervals
      FOR EACH ROW EXECUTE PROCEDURE recalculate_preset_total_duration();
  END IF;
END $$;

-- =============================================================================
-- SEED DATA FOR BUILT-IN TIMER PRESETS
-- =============================================================================

-- Insert built-in timer presets
INSERT INTO public.timer_presets (id, user_id, name, description, cycles, total_duration, is_built_in, created_at) VALUES
  ('00000000-0000-0000-0000-000000000001', NULL, 'Tabata 20/10', 'Classic Tabata: 20 seconds work, 10 seconds rest, 8 rounds', 8, 240, TRUE, now()),
  ('00000000-0000-0000-0000-000000000002', NULL, 'EMOM 60', 'Every Minute on the Minute for 10 minutes', 10, 600, TRUE, now()),
  ('00000000-0000-0000-0000-000000000003', NULL, '30-20-10 Sprint', 'Descending sprint intervals with equal rest', 3, 180, TRUE, now())
ON CONFLICT (id) DO NOTHING;

-- Insert built-in timer intervals for Tabata
INSERT INTO public.timer_intervals (id, preset_id, name, duration, type, audio_cue, voice_announcement) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Work', 20, 'work', 'beep', 'Work'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Rest', 10, 'rest', 'bell', 'Rest')
ON CONFLICT (id) DO NOTHING;

-- Insert built-in timer intervals for EMOM
INSERT INTO public.timer_intervals (id, preset_id, name, duration, type, audio_cue, voice_announcement) VALUES
  ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000002', 'Work', 60, 'work', 'start', 'Go')
ON CONFLICT (id) DO NOTHING;

-- Insert built-in timer intervals for Sprint
INSERT INTO public.timer_intervals (id, preset_id, name, duration, type, audio_cue, voice_announcement) VALUES
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000003', 'Sprint 30s', 30, 'work', 'start', 'Sprint 30 seconds'),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000003', 'Rest 30s', 30, 'rest', 'bell', 'Rest'),
  ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000003', 'Sprint 20s', 20, 'work', 'start', 'Sprint 20 seconds'),
  ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000003', 'Rest 20s', 20, 'rest', 'bell', 'Rest'),
  ('00000000-0000-0000-0003-000000000005', '00000000-0000-0000-0000-000000000003', 'Sprint 10s', 10, 'work', 'start', 'Sprint 10 seconds'),
  ('00000000-0000-0000-0003-000000000006', '00000000-0000-0000-0000-000000000003', 'Rest 10s', 10, 'rest', 'bell', 'Rest')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_histories_user_id ON public.chat_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_history_id ON public.chat_messages(chat_history_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON public.chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_id ON public.food_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_created_at ON public.food_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_timer_intervals_preset_id ON public.timer_intervals(preset_id);
CREATE INDEX IF NOT EXISTS idx_trainer_client_relationships_trainer_id ON public.trainer_client_relationships(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_client_relationships_client_id ON public.trainer_client_relationships(client_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_client_id ON public.trainer_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_trainer_notes_trainer_id ON public.trainer_notes(trainer_id);
CREATE INDEX IF NOT EXISTS idx_client_invites_trainer_id ON public.client_invites(trainer_id);
CREATE INDEX IF NOT EXISTS idx_agent_configs_client_id ON public.agent_configs(client_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_client_id ON public.workout_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_exercises_workout_plan_id ON public.exercises(workout_plan_id);
CREATE INDEX IF NOT EXISTS idx_pt_directives_client_id ON public.pt_directives(client_id);
CREATE INDEX IF NOT EXISTS idx_permission_settings_client_id ON public.permission_settings(client_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_client_id ON public.permission_audit_log(client_id);