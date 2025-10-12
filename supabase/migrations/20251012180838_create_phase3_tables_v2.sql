/*
  # Phase 3: Create Missing Tables

  Creates tables for:
  - role_access: Feature rollout stages
  - token_wallets: User credit balances
  - token_transactions: Credit transaction history
  - announcements: Admin announcements
  - announcement_reads: User read tracking

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users
*/

-- Role Access Table
CREATE TABLE IF NOT EXISTS public.role_access (
  role_name text PRIMARY KEY,
  stage text NOT NULL CHECK (stage IN ('admin', 'beta', 'public')),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.role_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read role access"
  ON public.role_access FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify role access"
  ON public.role_access FOR ALL
  TO authenticated
  USING ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin');

-- Token Wallets Table
CREATE TABLE IF NOT EXISTS public.token_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_usd numeric(10,2) NOT NULL DEFAULT 0.00,
  plan text NOT NULL DEFAULT 'free',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.token_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.token_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Token Transactions Table
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta_usd numeric(10,2) NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.token_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_token_transactions_user_created 
  ON public.token_transactions(user_id, created_at DESC);

-- Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('beta', 'all')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can create announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT role FROM public.profiles WHERE user_id = auth.uid()) = 'admin');

-- Announcement Reads Table
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own announcement reads"
  ON public.announcement_reads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RPC: allowed_roles
CREATE OR REPLACE FUNCTION public.allowed_roles()
RETURNS TABLE(role_name text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
  v_is_beta boolean;
BEGIN
  SELECT role, beta_user INTO v_role, v_is_beta
  FROM public.profiles
  WHERE user_id = auth.uid();

  RETURN QUERY
  SELECT ra.role_name
  FROM public.role_access ra
  WHERE ra.enabled = true
    AND (
      (ra.stage = 'public')
      OR (ra.stage = 'beta' AND COALESCE(v_is_beta, false))
      OR (ra.stage = 'admin' AND v_role = 'admin')
    );
END;
$$;

-- RPC: add_credits
CREATE OR REPLACE FUNCTION public.add_credits(p_amount_usd numeric, p_reason text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  INSERT INTO public.token_wallets (user_id, balance_usd, plan)
  VALUES (auth.uid(), p_amount_usd, 'free')
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance_usd = public.token_wallets.balance_usd + p_amount_usd,
    updated_at = now()
  RETURNING balance_usd INTO v_new_balance;

  INSERT INTO public.token_transactions (user_id, delta_usd, reason)
  VALUES (auth.uid(), p_amount_usd, p_reason);

  RETURN v_new_balance;
END;
$$;

-- RPC: spend_credits
CREATE OR REPLACE FUNCTION public.spend_credits(p_amount_usd numeric, p_reason text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  SELECT balance_usd INTO v_current_balance
  FROM public.token_wallets
  WHERE user_id = auth.uid();

  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
  END IF;

  IF v_current_balance < p_amount_usd THEN
    RAISE EXCEPTION 'Insufficient credits: have %.2f, need %.2f', v_current_balance, p_amount_usd;
  END IF;

  UPDATE public.token_wallets
  SET balance_usd = balance_usd - p_amount_usd,
      updated_at = now()
  WHERE user_id = auth.uid()
  RETURNING balance_usd INTO v_new_balance;

  INSERT INTO public.token_transactions (user_id, delta_usd, reason)
  VALUES (auth.uid(), -p_amount_usd, p_reason);

  RETURN v_new_balance;
END;
$$;

-- View: user credits with monthly delta
CREATE OR REPLACE VIEW public.v_user_credits AS
SELECT 
  tw.user_id,
  tw.plan,
  tw.balance_usd,
  COALESCE(SUM(tt.delta_usd) FILTER (
    WHERE tt.created_at >= date_trunc('month', now())
  ), 0) as month_delta_usd
FROM public.token_wallets tw
LEFT JOIN public.token_transactions tt ON tw.user_id = tt.user_id
GROUP BY tw.user_id, tw.plan, tw.balance_usd;

-- Seed initial role access
INSERT INTO public.role_access (role_name, stage, enabled) 
VALUES 
  ('TMWYA', 'beta', true),
  ('ShopLens', 'beta', true),
  ('VoiceChat', 'beta', true),
  ('MacroSwarm', 'beta', true),
  ('PersonaSwarm', 'beta', true)
ON CONFLICT (role_name) DO NOTHING;
