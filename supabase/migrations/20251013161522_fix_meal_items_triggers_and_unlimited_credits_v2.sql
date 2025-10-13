/*
  # Fix meal_items triggers + Add unlimited credits support
  
  ## Changes
  
  1. Remove Legacy Triggers
     - Drop 3 triggers on meal_items that reference old `meal_id` column
     - Our schema uses `meal_log_id` not `meal_id`
  
  2. Fix Trigger Functions
     - Update `meal_items_set_user_biur` to use `meal_log_id` and join to `meal_logs`
     - Update `touch_meal_totals` to use `meal_log_id`
  
  3. Unlimited Credits Support
     - Update `spend_credits` to skip deduction when plan = 'unlimited'
     - Add `set_unlimited_credits` admin RPC to toggle unlimited plan
     - Recreate `v_user_credits` view to include `is_unlimited` boolean
  
  ## Security
  - `set_unlimited_credits` requires is_admin = true
  - `spend_credits` respects unlimited plan
*/

-- =====================================================
-- PART 1: Fix meal_items triggers
-- =====================================================

-- Drop all custom triggers on meal_items
DROP TRIGGER IF EXISTS trg_meal_items_macros ON public.meal_items;
DROP TRIGGER IF EXISTS trg_meal_items_set_user ON public.meal_items;
DROP TRIGGER IF EXISTS trg_meal_items_totals ON public.meal_items;

-- Fix meal_items_set_user_biur function to use meal_log_id
CREATE OR REPLACE FUNCTION public.meal_items_set_user_biur()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT ml.user_id INTO NEW.user_id
    FROM public.meal_logs ml
    WHERE ml.id = NEW.meal_log_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix touch_meal_totals function to use meal_log_id
CREATE OR REPLACE FUNCTION public.touch_meal_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP IN ('INSERT','UPDATE')) AND NEW.meal_log_id IS NOT NULL THEN
    PERFORM public.recompute_meal_totals(NEW.meal_log_id);
  END IF;

  IF (TG_OP IN ('UPDATE','DELETE')) AND OLD.meal_log_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR NEW.meal_log_id IS DISTINCT FROM OLD.meal_log_id) THEN
    PERFORM public.recompute_meal_totals(OLD.meal_log_id);
  END IF;

  RETURN NULL;
END;
$$;

-- Recreate triggers with fixed functions (keep macro trigger as-is)
CREATE TRIGGER trg_meal_items_macros
  BEFORE INSERT OR UPDATE OF energy_kcal, protein_g, carbs_g, fat_g, macros
  ON public.meal_items
  FOR EACH ROW
  EXECUTE FUNCTION meal_items_compute_macros_biur();

CREATE TRIGGER trg_meal_items_set_user
  BEFORE INSERT OR UPDATE
  ON public.meal_items
  FOR EACH ROW
  EXECUTE FUNCTION meal_items_set_user_biur();

CREATE TRIGGER trg_meal_items_totals
  AFTER INSERT OR DELETE OR UPDATE
  ON public.meal_items
  FOR EACH ROW
  EXECUTE FUNCTION touch_meal_totals();

-- =====================================================
-- PART 2: Unlimited credits support
-- =====================================================

-- Update spend_credits to respect unlimited plan
CREATE OR REPLACE FUNCTION public.spend_credits(p_amount_usd numeric, p_reason text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_bal  numeric;
  v_plan text;
BEGIN
  IF v_user IS NULL THEN 
    RAISE EXCEPTION 'Not authenticated'; 
  END IF;

  SELECT plan, balance_usd INTO v_plan, v_bal
  FROM public.token_wallets 
  WHERE user_id = v_user 
  FOR UPDATE;

  -- Unlimited users never deduct balance
  IF v_plan = 'unlimited' THEN
    RETURN COALESCE(v_bal, 0);
  END IF;

  v_bal := COALESCE(v_bal, 0);
  
  IF v_bal < p_amount_usd THEN 
    RAISE EXCEPTION 'Insufficient credits'; 
  END IF;

  UPDATE public.token_wallets
  SET balance_usd = balance_usd - p_amount_usd, 
      updated_at = now()
  WHERE user_id = v_user
  RETURNING balance_usd INTO v_bal;

  INSERT INTO public.token_transactions(user_id, delta_usd, reason)
  VALUES (v_user, -p_amount_usd, COALESCE(p_reason,'spend'));

  RETURN v_bal;
END;
$$;

-- Add admin RPC to toggle unlimited credits for a user
CREATE OR REPLACE FUNCTION public.set_unlimited_credits(p_user uuid, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Admin check
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.user_id = auth.uid() AND p.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.token_wallets(user_id, plan)
  VALUES (p_user, CASE WHEN p_enabled THEN 'unlimited' ELSE 'free' END)
  ON CONFLICT (user_id) DO UPDATE
  SET plan = EXCLUDED.plan, 
      updated_at = now();
END;
$$;

-- Drop and recreate v_user_credits view with is_unlimited column
DROP VIEW IF EXISTS public.v_user_credits;

CREATE VIEW public.v_user_credits AS
SELECT
  w.user_id,
  w.plan,
  (w.plan = 'unlimited') AS is_unlimited,
  w.balance_usd,
  COALESCE((
    SELECT SUM(delta_usd)
    FROM public.token_transactions t
    WHERE t.user_id = w.user_id
      AND date_trunc('month', t.created_at) = date_trunc('month', now())
  ), 0) AS month_delta_usd
FROM public.token_wallets w;
