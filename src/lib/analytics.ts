// Analytics utility for tracking user events
// TODO: Replace with actual Mixpanel/Amplitude SDK when ready

interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  userId?: string;
}

class AnalyticsService {
  private isEnabled = true;

  // Initialize analytics (placeholder for SDK initialization)
  init() {
    console.log('Analytics service initialized');
    // TODO: Initialize Mixpanel/Amplitude SDK here
  }

  // Track an event
  trackEvent(eventName: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      eventName,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        platform: 'web',
        user_agent: navigator.userAgent,
      }
    };

    // For now, just log to console
    console.log('Analytics Event:', event);

    // TODO: Replace with actual analytics SDK call
    // Example: mixpanel.track(eventName, properties);
    // Example: amplitude.logEvent(eventName, properties);
  }

  // Identify a user
  identifyUser(userId: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    console.log('Analytics Identify:', { userId, properties });

    // TODO: Replace with actual analytics SDK call
    // Example: mixpanel.identify(userId);
    // Example: amplitude.setUserId(userId);
  }

  // Track user properties
  setUserProperties(properties: Record<string, any>) {
    if (!this.isEnabled) return;

    console.log('Analytics User Properties:', properties);

    // TODO: Replace with actual analytics SDK call
    // Example: mixpanel.people.set(properties);
    // Example: amplitude.setUserProperties(properties);
  }

  // Enable/disable analytics
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

export const analytics = new AnalyticsService();

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