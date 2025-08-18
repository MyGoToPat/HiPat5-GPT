// Analytics utility for tracking user events
// TODO: Replace with actual Mixpanel/Amplitude SDK when ready

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  userId?: string;
}

type AnalyticsClient = {
  trackEvent: (e: string, p?: Record<string, any>) => void;
  identifyUser: (id: string, p?: Record<string, any>) => void;
  setUserProperties: (p: Record<string, any>) => void;
  setEnabled: (v: boolean) => void;
};

const noopClient: AnalyticsClient = {
  trackEvent: () => {},
  identifyUser: () => {},
  setUserProperties: () => {},
  setEnabled: () => {},
};

export function initAnalytics(): AnalyticsClient {
  const disabled =
    import.meta.env.DEV ||
    String(import.meta.env.VITE_DISABLE_ANALYTICS || '').toLowerCase() === 'true' ||
    (typeof location !== 'undefined' &&
      (location.hostname.includes('bolt.') ||
       location.hostname.includes('stackblitz') ||
       location.hostname.includes('staticblitz')));
  
  if (disabled) {
    console.log('[analytics] disabled for preview');
    return noopClient;
  }
  
  // If you have a real analytics client, initialize here; otherwise return noop.
  return noopClient;
}

export const analytics = initAnalytics();

// Predefined event tracking functions
export const trackUserSignUp = (userId: string, method: 'email' = 'email') => {
  analytics.trackEvent('user_signed_up', {
    user_id: userId,
    method,
  });
};

export const trackTDEEWizardCompleted = (userId: string, tdee: number, bmr: number) => {
  analytics.trackEvent('tdee_wizard_completed', {
    user_id: userId,
    tdee,
    bmr,
  });
};

export const trackFirstFoodLog = (userId: string, foodName: string) => {
  analytics.trackEvent('first_food_log', {
    user_id: userId,
    food_name: foodName,
  });
};

export const trackFirstChatMessage = (userId: string) => {
  analytics.trackEvent('first_chat_message', {
    user_id: userId,
  });
};

export const trackDailyActiveUser = (userId: string) => {
  analytics.trackEvent('daily_active_user', {
    user_id: userId,
  });
};

export const trackWeeklyActiveUser = (userId: string) => {
  analytics.trackEvent('weekly_active_user', {
    user_id: userId,
  });
};

export const trackFoodMacroLookup = (userId: string, foodName: string, source: 'manual' | 'camera') => {
  analytics.trackEvent('food_macro_lookup', {
    user_id: userId,
    food_name: foodName,
    source,
  });
};