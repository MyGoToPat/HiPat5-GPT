/*
  # Add Country Code Support for US/CA Food Databases

  1. Purpose
    - Add country_code to user_preferences (US/CA, defaults from timezone)
    - Add country_code to food_cache (US/CA/NULL for generic whole foods)
    - Enable country-specific food database routing

  2. Strategy
    - Whole foods: country_code = NULL (USDA works for both countries)
    - US packaged foods: country_code = 'US'
    - CA packaged foods: country_code = 'CA'
    - Users default to country based on timezone (America/* → US, Canada/* → CA)

  3. Impact
    - Users can select US or CA for packaged food accuracy
    - Generic whole foods remain accessible to all users
    - Supports monthly database updates per country
*/

-- ========== PART 1: USER_PREFERENCES COUNTRY_CODE ==========

-- Add country_code column to user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN country_code text CHECK (country_code IN ('US', 'CA'));
    
    COMMENT ON COLUMN user_preferences.country_code IS 
      'User country preference for food database: US or CA. Defaults from timezone.';
  END IF;
END $$;

-- Function to infer country from timezone
CREATE OR REPLACE FUNCTION infer_country_from_timezone(tz text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Canadian timezones
  IF tz LIKE 'America/Toronto' 
     OR tz LIKE 'America/Vancouver'
     OR tz LIKE 'America/Winnipeg'
     OR tz LIKE 'America/Halifax'
     OR tz LIKE 'America/Edmonton'
     OR tz LIKE 'America/Regina'
     OR tz LIKE 'America/St_Johns'
     OR tz LIKE 'America/Dawson'
     OR tz LIKE 'America/Yellowknife'
     OR tz LIKE 'America/Moncton'
     OR tz LIKE 'America/Whitehorse'
     OR tz LIKE 'America/Thunder_Bay'
     OR tz LIKE 'America/Glace_Bay'
     OR tz LIKE 'America/Atikokan'
     OR tz LIKE 'America/Blanc-Sablon'
     OR tz LIKE 'America/Cambridge_Bay'
     OR tz LIKE 'America/Creston'
     OR tz LIKE 'America/Dawson_Creek'
     OR tz LIKE 'America/Fort_Nelson'
     OR tz LIKE 'America/Inuvik'
     OR tz LIKE 'America/Moncton'
     OR tz LIKE 'America/Nipigon'
     OR tz LIKE 'America/Pangnirtung'
     OR tz LIKE 'America/Rainy_River'
     OR tz LIKE 'America/Rankin_Inlet'
     OR tz LIKE 'America/Resolute'
     OR tz LIKE 'America/Swift_Current'
     OR tz LIKE 'America/Toronto'
     OR tz LIKE 'America/Vancouver'
     OR tz LIKE 'America/Winnipeg'
     OR tz LIKE 'Canada/%' THEN
    RETURN 'CA';
  END IF;
  
  -- Default to US for America/* timezones or any other
  RETURN 'US';
END;
$$;

-- Set country_code for existing users based on timezone
UPDATE user_preferences
SET country_code = infer_country_from_timezone(timezone)
WHERE country_code IS NULL;

-- Set default for new users (will be inferred from timezone via trigger)
ALTER TABLE user_preferences
ALTER COLUMN country_code SET DEFAULT 'US';

-- Create index for country_code queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_country_code 
ON user_preferences(country_code) 
WHERE country_code IS NOT NULL;

-- ========== PART 2: FOOD_CACHE COUNTRY_CODE ==========

-- Add country_code column to food_cache
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'food_cache' AND column_name = 'country_code'
  ) THEN
    ALTER TABLE food_cache 
    ADD COLUMN country_code text CHECK (country_code IN ('US', 'CA'));
    
    COMMENT ON COLUMN food_cache.country_code IS 
      'Food database source country: US (USDA), CA (Canadian Nutrient File), or NULL (generic whole foods usable by both)';
  END IF;
END $$;

-- Set existing foods to NULL (generic whole foods) or US if they have brand
UPDATE food_cache
SET country_code = CASE 
  WHEN brand IS NOT NULL AND brand != '' THEN 'US'
  ELSE NULL
END
WHERE country_code IS NULL;

-- Create index for country-specific queries
CREATE INDEX IF NOT EXISTS idx_food_cache_country_code 
ON food_cache(country_code) 
WHERE country_code IS NOT NULL;

-- Composite index for country + name lookups
CREATE INDEX IF NOT EXISTS idx_food_cache_country_name 
ON food_cache(country_code, LOWER(name)) 
WHERE country_code IS NOT NULL;

-- ========== PART 3: UPDATE USER CREATION TRIGGER ==========

-- Update handle_new_user function to set country_code from timezone
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create user_preferences with country inferred from timezone
  INSERT INTO public.user_preferences (
    user_id,
    timezone,
    country_code,  -- Added
    weight_unit,
    height_unit,
    theme,
    notifications_email,
    notifications_push,
    notifications_sms
  )
  VALUES (
    NEW.id,
    'America/New_York',  -- Default timezone
    infer_country_from_timezone('America/New_York'),  -- Default country from timezone
    'lbs',
    'feet',
    'dark',
    true,
    true,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Log completion
DO $$
DECLARE
  us_users INTEGER;
  ca_users INTEGER;
  null_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO us_users FROM user_preferences WHERE country_code = 'US';
  SELECT COUNT(*) INTO ca_users FROM user_preferences WHERE country_code = 'CA';
  SELECT COUNT(*) INTO null_users FROM user_preferences WHERE country_code IS NULL;
  
  RAISE NOTICE 'Country code migration complete:';
  RAISE NOTICE '  US users: %', us_users;
  RAISE NOTICE '  CA users: %', ca_users;
  RAISE NOTICE '  Null users: %', null_users;
END $$;






