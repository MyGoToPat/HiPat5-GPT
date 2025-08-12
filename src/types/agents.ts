export interface ConversationAgent {
  id: string;
  title: string;
  description: string;
  triggerPhrases: string[];
  category: 'nutrition' | 'fitness' | 'planning' | 'general';
  requiresCamera?: boolean;
  requiresVoice?: boolean;
  supportsSilentMode?: boolean;
  icon: string;
}

export interface AgentSession {
  agentId: string;
  sessionId: string;
  startTime: Date;
  mode: 'voice' | 'silent' | 'text';
  isActive: boolean;
  context?: any;
}

export interface MealTrackingContext {
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  estimatedCalories?: number;
  ingredients?: string[];
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface WorkoutTrackingContext {
  workoutType?: 'resistance' | 'cardio' | 'hybrid';
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
  }>;
  totalDuration?: number;
  estimatedCaloriesBurned?: number;
}

export interface MealPlanningContext {
  preferences?: string[];
  restrictions?: string[];
  targetCalories?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  location?: string;
  budget?: 'low' | 'medium' | 'high';
}