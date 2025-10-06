/*
  # Add fiber_g_target to user_metrics

  1. Schema Change
    - Add fiber_g_target column (optional, nullable float) to user_metrics
    - Users can set daily fiber intake goal (USDA recommends 25-35g/day)

  2. Notes
    - NULL means no target set (UI will show counts without progress bar)
    - If set, UI will render progress bar/percentage
*/

-- Add fiber_g_target column
ALTER TABLE public.user_metrics
  ADD COLUMN IF NOT EXISTS fiber_g_target float;

-- Add check constraint (reasonable range: 0-100g)
ALTER TABLE public.user_metrics
  ADD CONSTRAINT check_fiber_target_range
  CHECK (fiber_g_target IS NULL OR (fiber_g_target >= 0 AND fiber_g_target <= 100));

-- Add comment for documentation
COMMENT ON COLUMN public.user_metrics.fiber_g_target IS 'Optional daily fiber intake goal in grams. USDA recommends 25-35g per day. NULL means no target set.';
