/*
  # Add Cache Analytics Tracking

  1. New Table
    - `food_cache_analytics` - Track cache hit/miss rates and API usage

  2. Purpose
    - Monitor cost savings from cache usage
    - Identify popular foods that should be seeded
    - Track API provider usage (Gemini vs GPT-4o)
    - Calculate estimated cost savings

  3. Security
    - Only admins can read analytics
    - System can write analytics events

  4. Reporting
    - Daily rollups for cache performance
    - Provider cost comparison
    - Top uncached foods for seeding candidates
*/

-- Create cache analytics table
CREATE TABLE IF NOT EXISTS public.food_cache_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  event_type text NOT NULL CHECK (event_type IN ('cache_hit', 'cache_miss', 'gemini_call', 'gpt4o_call', 'cache_save')),
  food_name text NOT NULL,
  brand text,
  cache_id text,
  provider text, -- 'gemini', 'gpt4o', 'cache'
  response_time_ms int,
  estimated_cost_usd numeric(10, 6), -- Track actual cost
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.food_cache_analytics ENABLE ROW LEVEL SECURITY;

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS food_cache_analytics_date_idx ON public.food_cache_analytics(date DESC);
CREATE INDEX IF NOT EXISTS food_cache_analytics_event_idx ON public.food_cache_analytics(event_type, date DESC);
CREATE INDEX IF NOT EXISTS food_cache_analytics_food_idx ON public.food_cache_analytics(food_name, date DESC);

-- RLS: Only admins can read, system can write
DROP POLICY IF EXISTS "Admins can read cache analytics" ON public.food_cache_analytics;
CREATE POLICY "Admins can read cache analytics"
  ON public.food_cache_analytics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can write cache analytics" ON public.food_cache_analytics;
CREATE POLICY "System can write cache analytics"
  ON public.food_cache_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create daily analytics rollup view
CREATE OR REPLACE VIEW public.food_cache_daily_stats AS
SELECT
  date,
  COUNT(*) FILTER (WHERE event_type = 'cache_hit') as cache_hits,
  COUNT(*) FILTER (WHERE event_type = 'cache_miss') as cache_misses,
  COUNT(*) FILTER (WHERE event_type = 'gemini_call') as gemini_calls,
  COUNT(*) FILTER (WHERE event_type = 'gpt4o_call') as gpt4o_calls,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'cache_hit')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE event_type IN ('cache_hit', 'cache_miss')), 0) * 100,
    2
  ) as cache_hit_rate_pct,
  SUM(estimated_cost_usd) FILTER (WHERE provider = 'gemini') as gemini_cost_usd,
  SUM(estimated_cost_usd) FILTER (WHERE provider = 'gpt4o') as gpt4o_cost_usd,
  SUM(estimated_cost_usd) as total_cost_usd,
  -- Estimated savings (if we had used GPT-4o for everything)
  COUNT(*) FILTER (WHERE event_type = 'cache_hit') * 0.002 +
  COUNT(*) FILTER (WHERE event_type = 'gemini_call') * 0.002 * 0.94 as estimated_savings_usd,
  AVG(response_time_ms) FILTER (WHERE event_type IN ('cache_hit', 'gemini_call', 'gpt4o_call')) as avg_response_ms
FROM public.food_cache_analytics
GROUP BY date
ORDER BY date DESC;

-- Create view for top uncached foods (seeding candidates)
CREATE OR REPLACE VIEW public.food_cache_seeding_candidates AS
SELECT
  food_name,
  brand,
  COUNT(*) as miss_count,
  MAX(created_at) as last_requested,
  ROUND(COUNT(*) * 0.002, 4) as potential_savings_usd
FROM public.food_cache_analytics
WHERE event_type = 'cache_miss'
  AND created_at > now() - interval '30 days'
GROUP BY food_name, brand
HAVING COUNT(*) >= 3  -- Only show foods requested 3+ times
ORDER BY miss_count DESC
LIMIT 100;

-- Function to log cache analytics (called from edge function)
CREATE OR REPLACE FUNCTION public.log_food_cache_event(
  p_event_type text,
  p_food_name text,
  p_brand text DEFAULT NULL,
  p_cache_id text DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_response_time_ms int DEFAULT NULL,
  p_estimated_cost_usd numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.food_cache_analytics (
    event_type,
    food_name,
    brand,
    cache_id,
    provider,
    response_time_ms,
    estimated_cost_usd
  )
  VALUES (
    p_event_type,
    p_food_name,
    p_brand,
    p_cache_id,
    p_provider,
    p_response_time_ms,
    p_estimated_cost_usd
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_food_cache_event TO authenticated;
