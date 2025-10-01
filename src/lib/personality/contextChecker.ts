import { getSupabase } from '@/lib/supabase';

export interface UserContextFlags {
  isFirstTimeChat: boolean;
  hasTDEE: boolean;
  tdeeAge: number | null; // Days since TDEE was calculated
  chatCount: number;
  featuresSeen: string[];
  onboardingComplete: boolean;
  missingEssentials: string[];
  newFeaturesToShow: string[];
}

// Feature announcement system
const CURRENT_FEATURES = [
  {
    id: 'voice-chat-v1',
    name: 'Voice Chat',
    description: 'Talk to me hands-free',
    priority: 'high'
  },
  {
    id: 'food-camera-v1',
    name: 'Food Photo Logging',
    description: 'Take photos of meals for instant macro tracking',
    priority: 'medium'
  }
];

/**
 * Retrieves user context flags from database
 * Used to determine what reminders/onboarding Pat should provide
 */
export async function getUserContextFlags(userId: string): Promise<UserContextFlags> {
  const supabase = getSupabase();

  try {
    // Call database function to get user context
    const { data, error } = await supabase.rpc('get_user_context_flags', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching user context:', error);
      // Return safe defaults on error
      return getDefaultContextFlags();
    }

    const flags = data as any;

    // Determine missing essentials
    const missingEssentials: string[] = [];
    if (!flags.hasTDEE) {
      missingEssentials.push('TDEE Calculator');
    }
    if (!flags.onboardingComplete) {
      missingEssentials.push('Profile Setup');
    }

    // Determine new features to show (limit to 1 per chat to avoid overwhelming)
    const featuresSeen = flags.featuresSeen || [];
    const newFeaturesToShow = CURRENT_FEATURES
      .filter(f => !featuresSeen.includes(f.id))
      .filter(f => f.priority === 'high') // Only show high priority features automatically
      .slice(0, 1) // Max 1 feature per chat
      .map(f => f.name);

    return {
      isFirstTimeChat: flags.isFirstTimeChat || false,
      hasTDEE: flags.hasTDEE || false,
      tdeeAge: flags.tdeeAge,
      chatCount: flags.chatCount || 0,
      featuresSeen: featuresSeen,
      onboardingComplete: flags.onboardingComplete || false,
      missingEssentials,
      newFeaturesToShow
    };
  } catch (error) {
    console.error('Exception in getUserContextFlags:', error);
    return getDefaultContextFlags();
  }
}

/**
 * Updates user chat context after each interaction
 */
export async function updateUserChatContext(
  userId: string,
  featureShown?: string
): Promise<void> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase.rpc('update_user_chat_context', {
      p_user_id: userId,
      p_feature_shown: featureShown || null
    });

    if (error) {
      console.error('Error updating user chat context:', error);
    }
  } catch (error) {
    console.error('Exception in updateUserChatContext:', error);
  }
}

/**
 * Marks TDEE calculator as completed for the user
 */
export async function markTDEECompleted(
  userId: string,
  tdeeData: {
    tdee: number;
    bmr: number;
    macros?: {
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
    };
    calculated_at: string;
  }
): Promise<void> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase.rpc('mark_tdee_completed', {
      p_user_id: userId,
      p_tdee_data: tdeeData
    });

    if (error) {
      console.error('Error marking TDEE completed:', error);
      throw error;
    }
  } catch (error) {
    console.error('Exception in markTDEECompleted:', error);
    throw error;
  }
}

/**
 * Helper to build context message for Pat's prompt
 * This message gets injected into Pat's system prompt to inform responses
 */
export function buildContextMessage(flags: UserContextFlags): string {
  const messages: string[] = [];

  if (flags.isFirstTimeChat) {
    messages.push("This is the user's first interaction with you.");
  }

  if (!flags.hasTDEE) {
    messages.push("User has NOT completed TDEE calculator (CRITICAL for accurate tracking and goals).");
  } else if (flags.tdeeAge && flags.tdeeAge > 90) {
    messages.push(`User's TDEE calculation is ${Math.floor(flags.tdeeAge)} days old (recommend recalculation).`);
  }

  if (flags.newFeaturesToShow.length > 0) {
    messages.push(`New feature available: ${flags.newFeaturesToShow[0]}`);
  }

  if (messages.length === 0) {
    return "User context: All essentials completed, no urgent reminders.";
  }

  return `User context:\n${messages.map(m => `- ${m}`).join('\n')}`;
}

/**
 * Returns default/safe context flags when database is unavailable
 */
function getDefaultContextFlags(): UserContextFlags {
  return {
    isFirstTimeChat: false,
    hasTDEE: false,
    tdeeAge: null,
    chatCount: 0,
    featuresSeen: [],
    onboardingComplete: false,
    missingEssentials: ['TDEE Calculator'],
    newFeaturesToShow: []
  };
}
