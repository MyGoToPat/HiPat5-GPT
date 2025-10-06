/*
  # Add fiber_g column to portion_defaults table

  1. Schema Change
    - Add fiber_g column (float, default 0) to portion_defaults
    - Fiber is dietary fiber in grams per 100g (or per item for as-served foods)

  2. Performance
    - Add partial index for non-zero fiber values

  3. Notes
    - Existing rows will default to 0g fiber
    - New inserts from nutrition-resolver will include fiber_g
*/

-- Add fiber_g column
ALTER TABLE public.portion_defaults
  ADD COLUMN IF NOT EXISTS fiber_g float DEFAULT 0;

-- Add partial index for fiber queries (only index rows with fiber > 0)
CREATE INDEX IF NOT EXISTS idx_portion_defaults_fiber
  ON public.portion_defaults(fiber_g)
  WHERE fiber_g > 0;

-- Add comment for documentation
COMMENT ON COLUMN public.portion_defaults.fiber_g IS 'Dietary fiber in grams. Per 100g for cooked/raw basis, or per item for as-served basis. Defaults to 0 if unavailable.';
