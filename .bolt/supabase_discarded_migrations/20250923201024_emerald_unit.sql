/*
  # Create calculated metrics functions

  1. Database Functions
    - `calculate_user_workout_count(user_id)` - Returns total workout count for user
    - `calculate_user_day_streak(user_id)` - Returns current consecutive day streak
    - `calculate_user_achievements_earned(user_id)` - Returns count of earned achievements
    - `update_daily_activity_summary(user_id, date)` - Updates daily activity summary
    - `check_and_award_achievements(user_id)` - Checks and awards new achievements

  2. Purpose
    - These functions provide calculated metrics that can be called from frontend
    - Enable real-time calculation of dashboard values
    - Support achievement system logic
    - Maintain data consistency across tables

  3. Usage
    - Frontend components call these functions to get live metrics
    - Triggers can call these functions when data changes
    - Achievement system uses these for progress tracking
*/

-- Function to calculate total workout count for a user
CREATE OR REPLACE FUNCTION calculate_user_workout_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workout_count integer;
BEGIN
  SELECT COUNT(*)
  INTO workout_count
  FROM workout_logs
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(workout_count, 0);
END;
$$;

-- Function to calculate current day streak for a user
CREATE OR REPLACE FUNCTION calculate_user_day_streak(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  streak_count integer := 0;
  current_date date;
  has_activity boolean;
BEGIN
  current_date := CURRENT_DATE;
  
  -- Check each day going backwards from today
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM daily_activity_summary 
      WHERE user_id = p_user_id 
        AND activity_date = current_date 
        AND (had_workout = true OR logged_meals > 0 OR chat_interactions > 0)
    ) INTO has_activity;
    
    -- If no activity found, break the streak
    IF NOT has_activity THEN
      EXIT;
    END IF;
    
    streak_count := streak_count + 1;
    current_date := current_date - INTERVAL '1 day';
    
    -- Prevent infinite loops (max 365 days)
    IF streak_count > 365 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak_count;
END;
$$;

-- Function to count earned achievements for a user
CREATE OR REPLACE FUNCTION calculate_user_achievements_earned(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  earned_count integer;
BEGIN
  SELECT COUNT(*)
  INTO earned_count
  FROM user_achievements
  WHERE user_id = p_user_id AND is_earned = true;
  
  RETURN COALESCE(earned_count, 0);
END;
$$;

-- Function to update daily activity summary for a user
CREATE OR REPLACE FUNCTION update_daily_activity_summary(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  workout_count integer;
  meal_count integer;
  sleep_logged boolean;
  chat_count integer;
  total_cals integer;
  activity_score integer;
BEGIN
  -- Count workouts for the day
  SELECT COUNT(*) INTO workout_count
  FROM workout_logs
  WHERE user_id = p_user_id AND workout_date = p_date;
  
  -- Count meals for the day
  SELECT COUNT(*) INTO meal_count
  FROM food_logs
  WHERE user_id = p_user_id 
    AND DATE(created_at) = p_date;
  
  -- Check if sleep was logged
  SELECT EXISTS(
    SELECT 1 FROM sleep_logs
    WHERE user_id = p_user_id AND sleep_date = p_date
  ) INTO sleep_logged;
  
  -- Count chat interactions for the day
  SELECT COUNT(*) INTO chat_count
  FROM chat_messages cm
  JOIN chat_histories ch ON cm.chat_history_id = ch.id
  WHERE ch.user_id = p_user_id 
    AND cm.is_user = true
    AND DATE(cm.timestamp) = p_date;
  
  -- Calculate total calories for the day
  SELECT COALESCE(SUM((macros->>'kcal')::integer), 0) INTO total_cals
  FROM food_logs
  WHERE user_id = p_user_id 
    AND DATE(created_at) = p_date;
  
  -- Calculate activity score (0-100)
  activity_score := LEAST(100, 
    (CASE WHEN workout_count > 0 THEN 30 ELSE 0 END) +
    (LEAST(30, meal_count * 10)) +
    (CASE WHEN sleep_logged THEN 20 ELSE 0 END) +
    (LEAST(20, chat_count * 2))
  );
  
  -- Upsert daily activity summary
  INSERT INTO daily_activity_summary (
    user_id, activity_date, had_workout, logged_meals, 
    logged_sleep, chat_interactions, total_calories, activity_score
  ) VALUES (
    p_user_id, p_date, workout_count > 0, meal_count, 
    sleep_logged, chat_count, total_cals, activity_score
  )
  ON CONFLICT (user_id, activity_date) 
  DO UPDATE SET
    had_workout = EXCLUDED.had_workout,
    logged_meals = EXCLUDED.logged_meals,
    logged_sleep = EXCLUDED.logged_sleep,
    chat_interactions = EXCLUDED.chat_interactions,
    total_calories = EXCLUDED.total_calories,
    activity_score = EXCLUDED.activity_score,
    updated_at = now();
END;
$$;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  achievement_record record;
  user_progress numeric;
  new_achievements integer := 0;
BEGIN
  -- Loop through all active achievements
  FOR achievement_record IN 
    SELECT id, target_value, target_metric 
    FROM achievement_definitions 
    WHERE is_active = true
  LOOP
    -- Calculate current progress based on metric type
    CASE achievement_record.target_metric
      WHEN 'workout_count' THEN
        user_progress := calculate_user_workout_count(p_user_id);
      WHEN 'daily_streak' THEN
        user_progress := calculate_user_day_streak(p_user_id);
      WHEN 'meal_count' THEN
        SELECT COUNT(*) INTO user_progress FROM food_logs WHERE user_id = p_user_id;
      WHEN 'sleep_count' THEN
        SELECT COUNT(*) INTO user_progress FROM sleep_logs WHERE user_id = p_user_id;
      WHEN 'protein_days' THEN
        -- Count days where protein target was met (simplified)
        SELECT COUNT(*) INTO user_progress 
        FROM food_logs 
        WHERE user_id = p_user_id 
          AND (macros->>'protein_g')::numeric >= 100; -- Basic threshold
      WHEN 'morning_workouts' THEN
        SELECT COUNT(*) INTO user_progress 
        FROM workout_logs 
        WHERE user_id = p_user_id 
          AND EXTRACT(HOUR FROM created_at) < 8;
      ELSE
        user_progress := 0;
    END CASE;
    
    -- Upsert achievement progress
    INSERT INTO user_achievements (user_id, achievement_id, current_progress, is_earned, earned_at)
    VALUES (
      p_user_id, 
      achievement_record.id, 
      user_progress,
      user_progress >= achievement_record.target_value,
      CASE WHEN user_progress >= achievement_record.target_value THEN now() ELSE NULL END
    )
    ON CONFLICT (user_id, achievement_id)
    DO UPDATE SET
      current_progress = EXCLUDED.current_progress,
      is_earned = EXCLUDED.is_earned,
      earned_at = CASE 
        WHEN EXCLUDED.is_earned = true AND user_achievements.is_earned = false 
        THEN now() 
        ELSE user_achievements.earned_at 
      END,
      updated_at = now();
    
    -- Count newly earned achievements
    IF user_progress >= achievement_record.target_value THEN
      SELECT COUNT(*) INTO new_achievements
      FROM user_achievements
      WHERE user_id = p_user_id 
        AND achievement_id = achievement_record.id 
        AND is_earned = true
        AND earned_at >= now() - INTERVAL '1 minute';
    END IF;
  END LOOP;
  
  RETURN new_achievements;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_user_workout_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_day_streak(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_achievements_earned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_activity_summary(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_award_achievements(uuid) TO authenticated;