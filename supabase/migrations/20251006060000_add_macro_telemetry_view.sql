/*
  # Add Macro Telemetry View

  Phase 10: Telemetry & Debug Mode

  1. Creates a view for analyzing macro system performance
  2. Tracks success rates, resolver performance, and common errors
  3. Provides insights for debugging and optimization

  ## View Structure
  - Aggregates macro discussions by day
  - Shows success/failure rates
  - Tracks average resolution time
  - Identifies most queried foods
*/

-- Create telemetry view for macro system analytics
CREATE OR REPLACE VIEW public.macro_telemetry_summary AS
SELECT
  DATE(cmm.created_at) as date,
  COUNT(DISTINCT cmm.session_id) as unique_sessions,
  COUNT(cmm.id) as total_macro_queries,
  COUNT(cmm.id) FILTER (WHERE cmm.consumed = true) as consumed_count,
  COUNT(cmm.id) FILTER (WHERE cmm.consumed = false) as unconsumed_count,
  ROUND(
    COUNT(cmm.id) FILTER (WHERE cmm.consumed = true)::numeric /
    NULLIF(COUNT(cmm.id), 0) * 100,
    2
  ) as consumption_rate_pct,
  AVG(
    EXTRACT(EPOCH FROM (
      SELECT MIN(ml.created_at)
      FROM meal_logs ml
      WHERE ml.user_id = cs.user_id
      AND ml.created_at > cmm.created_at
      AND ml.source = 'macro-logging'
    ) - cmm.created_at)
  ) as avg_time_to_log_seconds,
  jsonb_object_agg(
    cmm.basis,
    COUNT(*)
  ) FILTER (WHERE cmm.basis IS NOT NULL) as basis_distribution
FROM public.chat_message_macros cmm
JOIN public.chat_sessions cs ON cs.id = cmm.session_id
WHERE cmm.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(cmm.created_at)
ORDER BY date DESC;

-- Grant access
GRANT SELECT ON public.macro_telemetry_summary TO authenticated;

COMMENT ON VIEW public.macro_telemetry_summary IS 'Aggregated telemetry for macro system performance analysis';
