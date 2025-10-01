/*
  # Tell Me What You Ate (TMWYA) - Complete System

  1. New Tables
    - `meal_logs` - Main meal logging table with totals and metadata
    - `meal_items` - Individual food items within each meal
    - `food_cache` - Cached food resolution results for performance
    - `day_rollups` - Daily aggregated nutrition data for fast queries
    - `mentor_plans` - Enterprise meal plans created by trainers for clients
    - `compliance_events` - Tracking of plan adherence for enterprise users

  2. Security
    - Enable RLS on all tables
    - Users can read/write their own meal data
    - Trainers can read client meal data via org membership
    - Admins have full access

  3. Performance
    - Indexes on user_id + date for fast queries
    - Cache lookups by canonical name + brand
    - Day rollup triggers for automatic aggregation

  4. Notes
    - Micronutrients column prepared but optional (Phase 1.1)
    - TEF (Thermic Effect of Food) calculated and stored
    - Mentor plans only apply when user has active_org_id
*/

-- ========== MEAL LOGS TABLE ==========
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  meal_slot text NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack', 'unknown')),
  source text NOT NULL CHECK (source IN ('text', 'voice', 'photo', 'barcode')),
  totals jsonb NOT NULL, -- {kcal, protein_g, carbs_g, fat_g, tef_kcal}
  micros_totals jsonb, -- {fiber_g, sodium_mg, potassium_mg} - optional, null in Phase 1
  note text,
  client_confidence float CHECK (client_confidence >= 0 AND client_confidence <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS meal_logs_user_date_idx ON public.meal_logs(user_id, DATE(ts));
CREATE INDEX IF NOT EXISTS meal_logs_user_created_idx ON public.meal_logs(user_id, created_at DESC);

-- ========== MEAL ITEMS TABLE ==========
CREATE TABLE IF NOT EXISTS public.meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id uuid NOT NULL REFERENCES public.meal_logs(id) ON DELETE CASCADE,
  position int NOT NULL, -- Order within the meal
  cache_id text, -- Reference to food_cache for faster lookups
  name text NOT NULL,
  brand text,
  qty float,
  unit text,
  grams float,
  macros jsonb NOT NULL, -- {kcal, protein_g, carbs_g, fat_g}
  micros jsonb, -- {fiber_g, sodium_mg, potassium_mg} - optional
  confidence float,
  source_hints jsonb, -- {barcode?, original_text?, vision_metadata?}
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS meal_items_meal_log_idx ON public.meal_items(meal_log_id);
CREATE INDEX IF NOT EXISTS meal_items_cache_idx ON public.meal_items(cache_id) WHERE cache_id IS NOT NULL;

-- ========== FOOD CACHE TABLE ==========
CREATE TABLE IF NOT EXISTS public.food_cache (
  id text PRIMARY KEY, -- canonical_name:brand:serving_size
  name text NOT NULL,
  brand text,
  serving_size text NOT NULL,
  grams_per_serving float NOT NULL,
  macros jsonb NOT NULL,
  micros jsonb,
  source_db text NOT NULL, -- 'USDA', 'OpenFoodFacts', 'manual'
  usda_fdc_id text,
  off_barcode text,
  confidence float DEFAULT 0.9,
  access_count int DEFAULT 0,
  last_accessed timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.food_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS food_cache_name_idx ON public.food_cache(LOWER(name));
CREATE INDEX IF NOT EXISTS food_cache_brand_idx ON public.food_cache(LOWER(brand)) WHERE brand IS NOT NULL;
CREATE INDEX IF NOT EXISTS food_cache_expires_idx ON public.food_cache(expires_at);
CREATE INDEX IF NOT EXISTS food_cache_usda_idx ON public.food_cache(usda_fdc_id) WHERE usda_fdc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS food_cache_barcode_idx ON public.food_cache(off_barcode) WHERE off_barcode IS NOT NULL;

-- ========== DAY ROLLUPS TABLE ==========
CREATE TABLE IF NOT EXISTS public.day_rollups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  totals jsonb NOT NULL, -- {kcal, protein_g, carbs_g, fat_g, tef_kcal, net_kcal}
  targets jsonb, -- {kcal, protein_g, carbs_g, fat_g} from user_metrics or mentor_plan
  delta jsonb, -- {kcal_diff, protein_diff, etc}
  completion jsonb, -- {kcal_pct, protein_pct, meals_logged, last_meal_time}
  meal_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.day_rollups ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS day_rollups_user_date_idx ON public.day_rollups(user_id, date DESC);

-- ========== MENTOR PLANS TABLE (Enterprise) ==========
CREATE TABLE IF NOT EXISTS public.mentor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by_trainer_id uuid NOT NULL REFERENCES auth.users(id),
  plan_name text NOT NULL,
  daily_targets jsonb NOT NULL, -- {kcal, protein_g, carbs_g, fat_g}
  meal_schedule jsonb, -- {breakfast: {time, kcal, macros}, lunch: {...}, etc}
  dietary_restrictions text[],
  notes text,
  active boolean DEFAULT true,
  starts_on date NOT NULL,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mentor_plans ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS mentor_plans_client_idx ON public.mentor_plans(client_id, active);
CREATE INDEX IF NOT EXISTS mentor_plans_org_idx ON public.mentor_plans(org_id);

-- ========== COMPLIANCE EVENTS TABLE (Enterprise) ==========
CREATE TABLE IF NOT EXISTS public.compliance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_plan_id uuid NOT NULL REFERENCES public.mentor_plans(id) ON DELETE CASCADE,
  meal_log_id uuid REFERENCES public.meal_logs(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('over_calories', 'under_protein', 'missed_meal', 'excellent_day', 'custom')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'success')),
  message text NOT NULL,
  delta jsonb, -- {kcal_over, protein_short, etc}
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS compliance_events_user_idx ON public.compliance_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS compliance_events_plan_idx ON public.compliance_events(mentor_plan_id);

-- ========== RLS POLICIES ==========

-- Meal Logs: Users can CRUD their own, trainers can read clients', admins can read all
DROP POLICY IF EXISTS "Users can manage own meal logs" ON public.meal_logs;
CREATE POLICY "Users can manage own meal logs"
  ON public.meal_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Trainers can read client meal logs" ON public.meal_logs;
CREATE POLICY "Trainers can read client meal logs"
  ON public.meal_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      JOIN public.profiles p ON p.user_id = meal_logs.user_id
      WHERE om.user_id = auth.uid()
        AND om.org_id = p.active_org_id
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Meal Items: Inherit access from meal_logs
DROP POLICY IF EXISTS "Users can manage own meal items" ON public.meal_items;
CREATE POLICY "Users can manage own meal items"
  ON public.meal_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs ml
      WHERE ml.id = meal_items.meal_log_id
        AND ml.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_logs ml
      WHERE ml.id = meal_items.meal_log_id
        AND ml.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Trainers can read client meal items" ON public.meal_items;
CREATE POLICY "Trainers can read client meal items"
  ON public.meal_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs ml
      JOIN public.profiles p ON p.user_id = ml.user_id
      JOIN public.org_members om ON om.org_id = p.active_org_id
      WHERE ml.id = meal_items.meal_log_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Food Cache: All authenticated users can read, system can write
DROP POLICY IF EXISTS "All users can read food cache" ON public.food_cache;
CREATE POLICY "All users can read food cache"
  ON public.food_cache
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "System can manage food cache" ON public.food_cache;
CREATE POLICY "System can manage food cache"
  ON public.food_cache
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Day Rollups: Same access as meal_logs
DROP POLICY IF EXISTS "Users can manage own day rollups" ON public.day_rollups;
CREATE POLICY "Users can manage own day rollups"
  ON public.day_rollups
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Trainers can read client day rollups" ON public.day_rollups;
CREATE POLICY "Trainers can read client day rollups"
  ON public.day_rollups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.org_members om ON om.org_id = p.active_org_id
      WHERE p.user_id = day_rollups.user_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Mentor Plans: Trainers can CRUD for their org clients, clients can read their own
DROP POLICY IF EXISTS "Trainers can manage client plans" ON public.mentor_plans;
CREATE POLICY "Trainers can manage client plans"
  ON public.mentor_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = mentor_plans.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.org_id = mentor_plans.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Clients can read own mentor plans" ON public.mentor_plans;
CREATE POLICY "Clients can read own mentor plans"
  ON public.mentor_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() = client_id);

-- Compliance Events: Users can read their own, trainers can read clients'
DROP POLICY IF EXISTS "Users can read own compliance events" ON public.compliance_events;
CREATE POLICY "Users can read own compliance events"
  ON public.compliance_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Trainers can read client compliance events" ON public.compliance_events;
CREATE POLICY "Trainers can read client compliance events"
  ON public.compliance_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.org_members om ON om.org_id = p.active_org_id
      WHERE p.user_id = compliance_events.user_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

DROP POLICY IF EXISTS "System can write compliance events" ON public.compliance_events;
CREATE POLICY "System can write compliance events"
  ON public.compliance_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ========== HELPER FUNCTIONS ==========

-- Update day_rollups when meal_logs change
CREATE OR REPLACE FUNCTION public.update_day_rollup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_totals jsonb;
  v_targets jsonb;
  v_meal_count int;
  v_last_meal_time timestamptz;
BEGIN
  -- Determine date and user_id based on operation
  IF TG_OP = 'DELETE' THEN
    v_date := DATE(OLD.ts);

    -- Recalculate totals for the day
    SELECT
      COALESCE(jsonb_build_object(
        'kcal', SUM((totals->>'kcal')::float),
        'protein_g', SUM((totals->>'protein_g')::float),
        'carbs_g', SUM((totals->>'carbs_g')::float),
        'fat_g', SUM((totals->>'fat_g')::float),
        'tef_kcal', SUM((totals->>'tef_kcal')::float)
      ), jsonb_build_object('kcal', 0, 'protein_g', 0, 'carbs_g', 0, 'fat_g', 0, 'tef_kcal', 0)),
      COUNT(*),
      MAX(ts)
    INTO v_totals, v_meal_count, v_last_meal_time
    FROM public.meal_logs
    WHERE user_id = OLD.user_id AND DATE(ts) = v_date;

    -- Update or delete rollup
    IF v_meal_count = 0 THEN
      DELETE FROM public.day_rollups WHERE user_id = OLD.user_id AND date = v_date;
    ELSE
      -- Get targets
      SELECT jsonb_build_object(
        'kcal', COALESCE(tdee, 2000),
        'protein_g', COALESCE(protein_g, 150),
        'carbs_g', COALESCE((tdee * 0.4 / 4), 200),
        'fat_g', COALESCE((tdee * 0.3 / 9), 67)
      ) INTO v_targets
      FROM public.user_metrics
      WHERE user_id = OLD.user_id;

      INSERT INTO public.day_rollups (user_id, date, totals, targets, meal_count, updated_at)
      VALUES (OLD.user_id, v_date, v_totals, v_targets, v_meal_count, now())
      ON CONFLICT (user_id, date) DO UPDATE SET
        totals = EXCLUDED.totals,
        meal_count = EXCLUDED.meal_count,
        updated_at = now();
    END IF;

    RETURN OLD;
  ELSE
    v_date := DATE(NEW.ts);

    -- Calculate totals for the day
    SELECT
      jsonb_build_object(
        'kcal', SUM((totals->>'kcal')::float),
        'protein_g', SUM((totals->>'protein_g')::float),
        'carbs_g', SUM((totals->>'carbs_g')::float),
        'fat_g', SUM((totals->>'fat_g')::float),
        'tef_kcal', SUM((totals->>'tef_kcal')::float),
        'net_kcal', SUM((totals->>'kcal')::float) - SUM((totals->>'tef_kcal')::float)
      ),
      COUNT(*),
      MAX(ts)
    INTO v_totals, v_meal_count, v_last_meal_time
    FROM public.meal_logs
    WHERE user_id = NEW.user_id AND DATE(ts) = v_date;

    -- Get user targets (from user_metrics or mentor_plan)
    SELECT jsonb_build_object(
      'kcal', COALESCE(tdee, 2000),
      'protein_g', COALESCE(protein_g, 150),
      'carbs_g', COALESCE((tdee * 0.4 / 4), 200),
      'fat_g', COALESCE((tdee * 0.3 / 9), 67)
    ) INTO v_targets
    FROM public.user_metrics
    WHERE user_id = NEW.user_id;

    -- TODO: Override with mentor_plan targets if active_org_id exists

    -- Upsert day_rollup
    INSERT INTO public.day_rollups (
      user_id, date, totals, targets,
      delta, completion, meal_count, updated_at
    )
    VALUES (
      NEW.user_id,
      v_date,
      v_totals,
      v_targets,
      jsonb_build_object(
        'kcal_diff', (v_totals->>'kcal')::float - COALESCE((v_targets->>'kcal')::float, 2000),
        'protein_diff', (v_totals->>'protein_g')::float - COALESCE((v_targets->>'protein_g')::float, 150)
      ),
      jsonb_build_object(
        'kcal_pct', ROUND((v_totals->>'kcal')::float / COALESCE((v_targets->>'kcal')::float, 2000) * 100),
        'protein_pct', ROUND((v_totals->>'protein_g')::float / COALESCE((v_targets->>'protein_g')::float, 150) * 100),
        'meals_logged', v_meal_count,
        'last_meal_time', v_last_meal_time
      ),
      v_meal_count,
      now()
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      totals = EXCLUDED.totals,
      targets = EXCLUDED.targets,
      delta = EXCLUDED.delta,
      completion = EXCLUDED.completion,
      meal_count = EXCLUDED.meal_count,
      updated_at = now();

    RETURN NEW;
  END IF;
END;
$$;

-- Trigger to auto-update day_rollups
DROP TRIGGER IF EXISTS meal_logs_update_rollup ON public.meal_logs;
CREATE TRIGGER meal_logs_update_rollup
  AFTER INSERT OR UPDATE OR DELETE ON public.meal_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_day_rollup();

-- Clean expired food cache entries (run via cron or manually)
CREATE OR REPLACE FUNCTION public.clean_expired_food_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.food_cache WHERE expires_at < now();
$$;
