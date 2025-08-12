import { ConversationAgent, AgentSession, MealTrackingContext, WorkoutTrackingContext, MealPlanningContext } from '../types/agents';

export class ConversationAgentManager {
  private static agents: ConversationAgent[] = [
    {
      id: 'meal-tracker',
      title: 'Tell me what you ate',
      description: 'Log your meals through voice or text description',
      triggerPhrases: ['tell me what you ate', 'log my meal', 'ate', 'food', 'meal'],
      category: 'nutrition',
      requiresVoice: true,
      supportsSilentMode: true,
      icon: '🍽️'
    },
    {
      id: 'visual-meal-tracker',
      title: 'Show me what you\'re eating',
      description: 'Use camera to identify and log your food',
      triggerPhrases: ['show me what you\'re eating', 'take food photo', 'camera meal'],
      category: 'nutrition',
      requiresCamera: true,
      requiresVoice: true,
      supportsSilentMode: true,
      icon: '📸'
    },
    {
      id: 'workout-tracker',
      title: 'Tell me about your workout',
      description: 'Log your workout through conversation',
      triggerPhrases: ['tell me about your workout', 'log workout', 'exercise', 'gym'],
      category: 'fitness',
      requiresVoice: true,
      supportsSilentMode: true,
      icon: '💪'
    },
    {
      id: 'live-workout-trainer',
      title: 'Show me your workout',
      description: 'Live workout tracking with real-time coaching',
      triggerPhrases: ['show me your workout', 'live workout', 'train with me'],
      category: 'fitness',
      requiresCamera: true,
      requiresVoice: true,
      supportsSilentMode: false,
      icon: '🏋️'
    },
    {
      id: 'meal-planner',
      title: 'Need a meal idea?',
      description: 'Get personalized meal suggestions and planning',
      triggerPhrases: ['need a meal idea', 'meal planning', 'what should I eat', 'hungry'],
      category: 'planning',
      requiresVoice: true,
      supportsSilentMode: true,
      icon: '🍳'
    },
    {
      id: 'restaurant-finder',
      title: 'Find nearby restaurants',
      description: 'Discover restaurants that match your macros',
      triggerPhrases: ['find restaurants', 'eat out', 'nearby food', 'restaurant'],
      category: 'planning',
      requiresVoice: true,
      supportsSilentMode: true,
      icon: '🏪'
    }
  ];

  private static activeSessions: Map<string, AgentSession> = new Map();

  static getAgents(): ConversationAgent[] {
    return this.agents;
  }

  static getAgentById(id: string): ConversationAgent | undefined {
    return this.agents.find(agent => agent.id === id);
  }

  static findAgentByTrigger(input: string): ConversationAgent | undefined {
    if (typeof input !== 'string') return undefined;
    const normalizedInput = input.toLowerCase().trim();
    
    return this.agents.find(agent => 
      agent.triggerPhrases.some(phrase => 
        typeof phrase === 'string' && normalizedInput.includes(phrase.toLowerCase())
      )
    );
  }

  static startAgentSession(agentId: string, mode: 'voice' | 'silent' | 'text' = 'voice'): AgentSession {
    const sessionId = `${agentId}-${Date.now()}`;
    const session: AgentSession = {
      agentId,
      sessionId,
      startTime: new Date(),
      mode,
      isActive: true
    };

    this.activeSessions.set(sessionId, session);
    return session;
  }

  static endAgentSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.activeSessions.delete(sessionId);
    }
  }

  static getActiveSession(): AgentSession | undefined {
    for (const session of this.activeSessions.values()) {
      if (session.isActive) {
        return session;
      }
    }
    return undefined;
  }

  // Agent-specific response generators
  static generateMealTrackingResponse(input: string, context?: MealTrackingContext): string {
    const responses = [
      "Great! I can help you log that meal. Can you tell me what you had?",
      "Perfect! Let me help you track your nutrition. What did you eat?",
      "I'm ready to log your meal. Please describe what you had to eat.",
      "Excellent! I'll help you track this meal. What were the main components?"
    ];

    if (context?.mealType) {
      return `I see you're logging ${context.mealType}. ${responses[Math.floor(Math.random() * responses.length)]}`;
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }

  static generateWorkoutTrackingResponse(input: string, context?: WorkoutTrackingContext): string {
    const responses = [
      "Awesome! Let's log your workout. What exercises did you do?",
      "Great job working out! Tell me about your session.",
      "I'm excited to hear about your workout! What did you train today?",
      "Perfect timing! Let's get your workout logged. What was your focus today?"
    ];

    if (context?.workoutType) {
      return `I see you did a ${context.workoutType} workout. ${responses[Math.floor(Math.random() * responses.length)]}`;
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }

  static generateMealPlanningResponse(input: string, context?: MealPlanningContext): string {
    const responses = [
      "I'd love to help you plan a meal! What are you in the mood for?",
      "Let's find you something delicious and nutritious! Any preferences?",
      "Perfect! I can suggest meals based on your goals. What sounds good?",
      "Great question! Let me help you plan something that fits your macros."
    ];

    if (context?.mealType) {
      return `Looking for ${context.mealType} ideas? ${responses[Math.floor(Math.random() * responses.length)]}`;
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }

  static generateCameraResponse(agentId: string): string {
    switch (agentId) {
      case 'visual-meal-tracker':
        return "I can see your food! Let me analyze this for you. This looks like a healthy meal. Would you like me to estimate the calories and macros?";
      case 'live-workout-trainer':
        return "Perfect! I can see you're ready to work out. Let's start with your first exercise. What are we training today?";
      default:
        return "I can see what you're showing me. How can I help you with this?";
    }
  }

  static generateSilentModeResponse(agentId: string, input: string): string {
    const silentResponses = {
      'meal-tracker': [
        "✅ Meal logged: Estimated 450 calories",
        "🍽️ Added to your daily nutrition",
        "📊 Protein target: 85% complete",
        "✨ Great choice for your goals!"
      ],
      'workout-tracker': [
        "💪 Workout logged successfully",
        "🔥 Great session! 320 calories burned",
        "📈 Volume increased 12% from last week",
        "⭐ New personal record detected!"
      ],
      'meal-planner': [
        "🍳 Here are 3 meal ideas for you:",
        "🥗 Grilled chicken salad (420 cal)",
        "🍲 Protein bowl (380 cal)",
        "🐟 Salmon with quinoa (450 cal)"
      ]
    };

    const responses = silentResponses[agentId as keyof typeof silentResponses] || ["👍 Got it!"];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}