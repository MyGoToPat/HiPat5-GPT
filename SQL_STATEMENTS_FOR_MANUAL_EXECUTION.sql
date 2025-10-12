-- ════════════════════════════════════════════════════════════════
-- PAT REBUILD - SQL STATEMENTS FOR MANUAL EXECUTION
-- DO NOT RUN THIS FILE AUTOMATICALLY
-- Copy and paste each section into Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════
--
-- Instructions:
-- 1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/jdtogitfqptdrxkczdbw/sql
-- 2. Copy each section below ONE AT A TIME
-- 3. Run and verify before proceeding to next section
-- 4. Take screenshots of successful execution
-- 5. Report any errors immediately
--
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- E4: CHAT HISTORY (sessions + messages) with RLS
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  title text
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_owner ON public.chat_sessions
FOR ALL
USING (auth.uid()=user_id)
WITH CHECK (auth.uid()=user_id);

CREATE POLICY cm_owner ON public.chat_messages
FOR ALL
USING (EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id=chat_messages.session_id AND s.user_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.chat_sessions s WHERE s.id=chat_messages.session_id AND s.user_id=auth.uid()));

CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON public.chat_messages(session_id, created_at);

-- Verification:
-- SELECT * FROM public.chat_sessions LIMIT 1;
-- SELECT * FROM public.chat_messages LIMIT 1;

-- ────────────────────────────────────────────────────────────────
-- E5: ROLE ROLLOUT (admin → beta → public)
-- ────────────────────────────────────────────────────────────────

CREATE TYPE IF NOT EXISTS public.rollout_stage AS ENUM ('admin','beta','public');

CREATE TABLE IF NOT EXISTS public.role_access (
  role_name text PRIMARY KEY,
  stage public.rollout_stage NOT NULL DEFAULT 'admin',
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_beta  boolean DEFAULT false;

CREATE OR REPLACE FUNCTION public.allowed_roles()
RETURNS TABLE(role_name text) LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE v_is_admin boolean;
DECLARE v_is_beta boolean;
BEGIN
  SELECT is_admin, is_beta INTO v_is_admin, v_is_beta
  FROM public.user_profiles
  WHERE user_id=auth.uid();

  RETURN QUERY
  SELECT ra.role_name
  FROM public.role_access ra
  WHERE ra.enabled = true
    AND (ra.stage='public'
         OR (ra.stage='beta' AND v_is_beta)
         OR (ra.stage='admin' AND v_is_admin));
END; $$;

-- Insert default roles at admin stage
INSERT INTO public.role_access(role_name,stage) VALUES
  ('TMWYA','admin'),
  ('KPI','admin'),
  ('UNDIET','admin')
ON CONFLICT DO NOTHING;

-- Verification:
-- SELECT * FROM public.role_access;
-- SELECT public.allowed_roles(); -- Should return empty for non-admin user

-- ────────────────────────────────────────────────────────────────
-- E2: CREDITS WALLET (token ledger)
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.token_wallets(
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_usd numeric NOT NULL DEFAULT 0,
  plan text NOT NULL DEFAULT 'free',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.token_transactions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta_usd numeric NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.token_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallets_owner_sel ON public.token_wallets
FOR SELECT
USING (auth.uid()=user_id);

CREATE POLICY wallets_owner_upd ON public.token_wallets
FOR UPDATE
USING (auth.uid()=user_id)
WITH CHECK (auth.uid()=user_id);

CREATE POLICY tx_owner_sel ON public.token_transactions
FOR SELECT
USING (auth.uid()=user_id);

CREATE OR REPLACE FUNCTION public.add_credits(p_amount_usd numeric, p_reason text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user uuid:=auth.uid(); v_new numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.token_transactions(user_id,delta_usd,reason)
  VALUES (v_user,p_amount_usd,coalesce(p_reason,'add'));

  INSERT INTO public.token_wallets(user_id,balance_usd)
  VALUES (v_user,p_amount_usd)
  ON CONFLICT (user_id) DO UPDATE
  SET balance_usd=public.token_wallets.balance_usd + EXCLUDED.balance_usd,
      updated_at=now()
  RETURNING balance_usd INTO v_new;

  RETURN v_new;
END; $$;

CREATE OR REPLACE FUNCTION public.spend_credits(p_amount_usd numeric, p_reason text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user uuid:=auth.uid(); v_bal numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT balance_usd
  FROM public.token_wallets
  WHERE user_id=v_user
  FOR UPDATE NOWAIT
  INTO v_bal;

  IF v_bal IS NULL THEN v_bal:=0; END IF;
  IF v_bal < p_amount_usd THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  UPDATE public.token_wallets
  SET balance_usd=balance_usd - p_amount_usd, updated_at=now()
  WHERE user_id=v_user
  RETURNING balance_usd INTO v_bal;

  INSERT INTO public.token_transactions(user_id,delta_usd,reason)
  VALUES (v_user,-p_amount_usd,coalesce(p_reason,'spend'));

  RETURN v_bal;
END; $$;

CREATE OR REPLACE VIEW public.v_user_credits AS
SELECT w.user_id, w.plan, w.balance_usd,
       (SELECT coalesce(sum(delta_usd),0)
        FROM public.token_transactions t
        WHERE t.user_id=w.user_id
        AND date_trunc('month',t.created_at)=date_trunc('month',now())) AS month_delta_usd
FROM public.token_wallets w;

-- Verification:
-- SELECT public.add_credits(2.00, 'monthly_free');
-- SELECT * FROM public.v_user_credits;
-- SELECT public.spend_credits(0.02, 'test_spend');
-- SELECT * FROM public.v_user_credits;

-- ────────────────────────────────────────────────────────────────
-- ANNOUNCEMENTS + INBOX (broadcasts to beta/all)
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.announcements(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('beta','all')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.announcement_reads(
  announcement_id uuid REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Everyone can read announcements they're eligible for
CREATE POLICY ann_read ON public.announcements
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_profiles p
          WHERE p.user_id=auth.uid()
          AND ((audience='all') OR (audience='beta' AND p.is_beta)))
);

-- Admin-only insert
CREATE POLICY ann_admin_ins ON public.announcements
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_profiles p
          WHERE p.user_id=auth.uid() AND p.is_admin)
);

-- Reads are owner-only
CREATE POLICY ann_reads_owner ON public.announcement_reads
FOR ALL
USING (auth.uid()=user_id)
WITH CHECK (auth.uid()=user_id);

-- Verification:
-- SELECT * FROM public.announcements;
-- SELECT * FROM public.announcement_reads;

-- ────────────────────────────────────────────────────────────────
-- E1: MEALS + ITEMS + KPIs + RPCs
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL DEFAULT now(),
  meal_slot text,
  source text NOT NULL DEFAULT 'text',
  kcal numeric NOT NULL,
  protein_g numeric NOT NULL,
  fat_g numeric NOT NULL,
  carbs_g numeric NOT NULL,
  fiber_g numeric NOT NULL,
  assumptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS meal_logs_idem_ux ON public.meal_logs (user_id, idempotency_key);

CREATE TABLE IF NOT EXISTS public.meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id uuid NOT NULL REFERENCES public.meal_logs(id) ON DELETE CASCADE,
  position int NOT NULL,
  name text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  energy_kcal numeric NOT NULL,
  protein_g numeric NOT NULL,
  fat_g numeric NOT NULL,
  carbs_g numeric NOT NULL,
  fiber_g numeric NOT NULL
);

ALTER TABLE public.meal_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_logs_owner_ins ON public.meal_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY meal_logs_owner_sel ON public.meal_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY meal_items_owner_all ON public.meal_items
USING (EXISTS (SELECT 1 FROM public.meal_logs ml WHERE ml.id = meal_items.meal_log_id AND ml.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.meal_logs ml WHERE ml.id = meal_items.meal_log_id AND ml.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.make_meal_idem_key(p_user uuid, p_ts timestamptz, p_totals jsonb)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256((p_user::text||'|'||date_trunc('minute',p_ts)::text||'|'||
                       coalesce(p_totals->>'kcal','')||'|'||coalesce(p_totals->>'protein_g','')||'|'||
                       coalesce(p_totals->>'fat_g','')||'|'||coalesce(p_totals->>'carbs_g','')||'|'||
                       coalesce(p_totals->>'fiber_g',''))::bytea),'hex');
$$;

CREATE OR REPLACE FUNCTION public.log_meal(
  p_ts timestamptz, p_meal_slot text, p_source text, p_totals jsonb, p_items jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_user uuid:=auth.uid(); v_key text; v_log uuid; i jsonb; pos int:=0;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_key:=public.make_meal_idem_key(v_user,p_ts,p_totals);

  INSERT INTO public.meal_logs(user_id,ts,meal_slot,source,kcal,protein_g,fat_g,carbs_g,fiber_g,assumptions,idempotency_key)
  VALUES (v_user,p_ts,p_meal_slot,coalesce(p_source,'text'),
          (p_totals->>'kcal')::numeric,(p_totals->>'protein_g')::numeric,(p_totals->>'fat_g')::numeric,
          (p_totals->>'carbs_g')::numeric,(p_totals->>'fiber_g')::numeric,
          coalesce(p_totals->'assumptions','[]'::jsonb),v_key)
  ON CONFLICT (user_id,idempotency_key) DO UPDATE SET id=meal_logs.id
  RETURNING id INTO v_log;

  FOR i IN SELECT jsonb_array_elements(p_items) LOOP
    pos:=pos+1;
    INSERT INTO public.meal_items(meal_log_id,position,name,quantity,unit,energy_kcal,protein_g,fat_g,carbs_g,fiber_g)
    VALUES (v_log,pos,(i->>'name'),(i->>'quantity')::numeric,(i->>'unit'),
            ((i->'macros')->>'kcal')::numeric,((i->'macros')->>'protein_g')::numeric,
            ((i->'macros')->>'fat_g')::numeric,((i->'macros')->>'carbs_g')::numeric,
            ((i->'macros')->>'fiber_g')::numeric);
  END LOOP;

  RETURN v_log;
END; $$;

CREATE OR REPLACE FUNCTION public.kpis_today(p_tz text)
RETURNS TABLE(kcal numeric, protein_g numeric, fat_g numeric, carbs_g numeric, fiber_g numeric)
LANGUAGE sql SECURITY INVOKER AS $$
  SELECT coalesce(sum(kcal),0),coalesce(sum(protein_g),0),coalesce(sum(fat_g),0),
         coalesce(sum(carbs_g),0),coalesce(sum(fiber_g),0)
  FROM public.meal_logs
  WHERE user_id=auth.uid()
    AND ts >= date_trunc('day',(now() AT TIME ZONE p_tz)) AT TIME ZONE p_tz
    AND ts <  (date_trunc('day',(now() AT TIME ZONE p_tz)) AT TIME ZONE p_tz + interval '1 day');
$$;

-- Verification:
-- SELECT * FROM public.kpis_today('America/Toronto');

-- ────────────────────────────────────────────────────────────────
-- E3: Learning Style + Preferences + UNDIET metrics
-- ────────────────────────────────────────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS learning_style text CHECK (learning_style IN ('visual','auditory','kinesthetic','unknown')) DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS learning_style_confidence numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS food_preferences jsonb;

ALTER TABLE public.user_metrics
  ADD COLUMN IF NOT EXISTS undiet_metrics jsonb;

COMMENT ON COLUMN public.user_profiles.learning_style IS 'Detected learning preference: visual, auditory, or kinesthetic';
COMMENT ON COLUMN public.user_profiles.food_preferences IS 'JSON: {top_foods, avoided_foods, cuisine_types, dietary_pattern, macro_tendencies}';
COMMENT ON COLUMN public.user_metrics.undiet_metrics IS 'JSON: {avg_eating_window_hours, avg_fasting_window_hours, avg_meal_frequency, avg_time_between_meals_hours, meal_timing_consistency}';

-- Verification:
-- SELECT learning_style, learning_style_confidence FROM public.user_profiles LIMIT 1;
-- SELECT undiet_metrics FROM public.user_metrics LIMIT 1;

-- ════════════════════════════════════════════════════════════════
-- END OF SQL STATEMENTS
-- ════════════════════════════════════════════════════════════════
--
-- NEXT STEPS:
-- 1. Run each section above in Supabase SQL Editor
-- 2. Take screenshots of successful execution
-- 3. Test with verification queries provided in comments
-- 4. Report any errors immediately
--
-- EXPECTED RESULTS:
-- - 9 new tables created
-- - 4 RPCs created (allowed_roles, add_credits, spend_credits, log_meal, kpis_today)
-- - 1 view created (v_user_credits)
-- - 1 enum type created (rollout_stage)
-- - Multiple RLS policies created
-- - Columns added to user_profiles and user_metrics
--
-- ════════════════════════════════════════════════════════════════
