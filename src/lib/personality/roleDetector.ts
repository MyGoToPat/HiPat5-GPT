export interface RoleContext {
  roleId: string | null;
  roleName: string;
  confidence: number;
  extractedParams: Record<string, any>;
}

/**
 * Detects which role (if any) should be activated based on user message
 * This is a fast, deterministic regex-based system (no LLM calls)
 */
export function detectRole(message: string): RoleContext {
  const msg = message.toLowerCase().trim();

  // TMWYA - Food logging
  const foodPatterns = [
    /i (ate|had|consumed|logged)/i,
    /(breakfast|lunch|dinner|snack|meal).*:/i,
    /calories in/i,
    /macros for/i,
    /nutritional (info|data|facts) (for|of)/i,
  ];
  if (foodPatterns.some(p => p.test(msg))) {
    return {
      roleId: 'tmwya',
      roleName: 'Tell Me What You Ate',
      confidence: 0.9,
      extractedParams: extractFoodParams(message)
    };
  }

  // MMB - Support/Feedback
  const supportPatterns = [
    /bug|issue|problem|error/i,
    /not working|broken|glitch|crash/i,
    /(improve|better|enhance|fix) (pat|this|the app)/i,
    /suggestion|feedback|request/i,
    /make (me|pat) better/i,
  ];
  if (supportPatterns.some(p => p.test(msg))) {
    return {
      roleId: 'mmb',
      roleName: 'Make Me Better',
      confidence: 0.85,
      extractedParams: { feedbackType: categorizeFeedback(message) }
    };
  }

  // Fitness Coach
  const fitnessPatterns = [
    /workout|exercise|training|gym/i,
    /lift|squat|bench|deadlift|press/i,
    /reps|sets|program|routine/i,
    /muscle|strength|hypertrophy/i,
    /(build|gain) muscle/i,
    /get stronger|increase strength/i,
  ];
  if (fitnessPatterns.some(p => p.test(msg))) {
    return {
      roleId: 'fitness-coach',
      roleName: 'Fitness Coach',
      confidence: 0.85,
      extractedParams: extractWorkoutParams(message)
    };
  }

  // Nutrition Planner
  const nutritionPatterns = [
    /meal plan|diet plan/i,
    /what should i eat/i,
    /macro targets|calorie targets/i,
    /cutting|bulking|maintaining|recomp/i,
    /lose (weight|fat)|fat loss/i,
  ];
  if (nutritionPatterns.some(p => p.test(msg))) {
    return {
      roleId: 'nutrition-planner',
      roleName: 'Nutrition Planner',
      confidence: 0.85,
      extractedParams: extractNutritionParams(message)
    };
  }

  // No role detected - general conversation
  return {
    roleId: null,
    roleName: 'General Assistant',
    confidence: 1.0,
    extractedParams: {}
  };
}

/**
 * Extracts food-related parameters from message
 */
function extractFoodParams(message: string): Record<string, any> {
  const params: Record<string, any> = {};

  // Try to extract meal type
  const mealMatch = message.match(/(breakfast|lunch|dinner|snack)/i);
  if (mealMatch) {
    params.mealType = mealMatch[1].toLowerCase();
  }

  // Try to extract food items (simple word extraction after common verbs)
  const foodMatch = message.match(/(?:ate|had|consumed|logged)\s+([^.!?]+)/i);
  if (foodMatch) {
    params.foodDescription = foodMatch[1].trim();
  }

  return params;
}

/**
 * Categorizes feedback type
 */
function categorizeFeedback(message: string): string {
  const msg = message.toLowerCase();

  if (/bug|error|crash|broken|not working/i.test(msg)) {
    return 'BUG';
  }

  if (/suggest|request|add|want|wish|would be (nice|great|cool)/i.test(msg)) {
    return 'FEATURE_REQUEST';
  }

  if (/improve|better|enhance|optimize/i.test(msg)) {
    return 'IMPROVEMENT';
  }

  if (/confus|unclear|hard to (use|understand)|difficult/i.test(msg)) {
    return 'UX_ISSUE';
  }

  return 'GENERAL_FEEDBACK';
}

/**
 * Extracts workout-related parameters
 */
function extractWorkoutParams(message: string): Record<string, any> {
  const params: Record<string, any> = {};

  // Extract specific exercises mentioned
  const exercises = [
    'squat', 'bench', 'deadlift', 'press', 'row',
    'pullup', 'chinup', 'dip', 'curl', 'extension'
  ];

  for (const exercise of exercises) {
    if (new RegExp(exercise, 'i').test(message)) {
      params.mentionedExercise = exercise;
      break;
    }
  }

  // Extract goals if mentioned
  if (/build muscle|hypertrophy|mass|size/i.test(message)) {
    params.goal = 'hypertrophy';
  } else if (/strength|stronger|lift more/i.test(message)) {
    params.goal = 'strength';
  } else if (/lose fat|cut|shred/i.test(message)) {
    params.goal = 'fat_loss';
  }

  return params;
}

/**
 * Extracts nutrition-related parameters
 */
function extractNutritionParams(message: string): Record<string, any> {
  const params: Record<string, any> = {};

  // Extract diet goal
  if (/cut|lose (weight|fat)|fat loss/i.test(message)) {
    params.goal = 'cut';
  } else if (/bulk|gain (weight|muscle)|mass/i.test(message)) {
    params.goal = 'bulk';
  } else if (/maintain|recomp/i.test(message)) {
    params.goal = 'maintain';
  }

  // Extract dietary preferences if mentioned
  if (/vegan/i.test(message)) {
    params.dietType = 'vegan';
  } else if (/vegetarian/i.test(message)) {
    params.dietType = 'vegetarian';
  } else if (/keto/i.test(message)) {
    params.dietType = 'keto';
  } else if (/paleo/i.test(message)) {
    params.dietType = 'paleo';
  }

  return params;
}
