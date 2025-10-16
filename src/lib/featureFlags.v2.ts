export type FeatureFlag =
  | 'SWARM_V2_ENABLED'
  | 'RESPONSE_RENDERER_ENABLED'
  | 'DIETARY_FILTERS_ENABLED'
  | 'MEMORY_SYSTEM_ENABLED'
  | 'MEMORY_UI_ENABLED'
  | 'ADMIN_PROMPT_EDITOR_ENABLED'
  | 'SWARM_TELEMETRY_ENABLED'
  | 'FILTER_KETO'
  | 'FILTER_LOW_CARB'
  | 'FILTER_CARNIVORE'
  | 'FILTER_ALLERGEN'
  | 'FILTER_RELIGIOUS';

interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  allowedRoles?: string[];
  allowedUsers?: string[];
}

const DEFAULT_FLAGS: Record<FeatureFlag, FeatureFlagConfig> = {
  SWARM_V2_ENABLED: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  },
  RESPONSE_RENDERER_ENABLED: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  },
  DIETARY_FILTERS_ENABLED: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  },
  MEMORY_SYSTEM_ENABLED: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  },
  MEMORY_UI_ENABLED: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin']
  },
  ADMIN_PROMPT_EDITOR_ENABLED: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin']
  },
  SWARM_TELEMETRY_ENABLED: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  },
  FILTER_KETO: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  },
  FILTER_LOW_CARB: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  },
  FILTER_CARNIVORE: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  },
  FILTER_ALLERGEN: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  },
  FILTER_RELIGIOUS: {
    enabled: false,
    rolloutPercentage: 0,
    allowedRoles: ['admin', 'beta']
  }
};

class FeatureFlagManager {
  private flags: Map<FeatureFlag, FeatureFlagConfig> = new Map();

  constructor() {
    Object.entries(DEFAULT_FLAGS).forEach(([key, config]) => {
      this.flags.set(key as FeatureFlag, config);
    });
  }

  isEnabled(
    flag: FeatureFlag,
    context?: {
      userId?: string;
      userRole?: string;
    }
  ): boolean {
    const config = this.flags.get(flag);
    if (!config) return false;

    if (!config.enabled) return false;

    if (context?.userRole && config.allowedRoles) {
      if (!config.allowedRoles.includes(context.userRole)) {
        return false;
      }
    }

    if (context?.userId && config.allowedUsers) {
      if (!config.allowedUsers.includes(context.userId)) {
        return false;
      }
    }

    if (config.rolloutPercentage !== undefined && config.rolloutPercentage < 100) {
      const hash = context?.userId
        ? this.hashUserId(context.userId, flag)
        : Math.random() * 100;
      return hash < config.rolloutPercentage;
    }

    return true;
  }

  setFlag(flag: FeatureFlag, config: Partial<FeatureFlagConfig>): void {
    const existing = this.flags.get(flag) || { enabled: false };
    this.flags.set(flag, { ...existing, ...config });
  }

  getConfig(flag: FeatureFlag): FeatureFlagConfig | undefined {
    return this.flags.get(flag);
  }

  getAllFlags(): Map<FeatureFlag, FeatureFlagConfig> {
    return new Map(this.flags);
  }

  private hashUserId(userId: string, flag: FeatureFlag): number {
    const str = `${userId}-${flag}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash % 100);
  }
}

export const featureFlagManager = new FeatureFlagManager();

export function isFeatureEnabled(
  flag: FeatureFlag,
  context?: {
    userId?: string;
    userRole?: string;
  }
): boolean {
  return featureFlagManager.isEnabled(flag, context);
}

export function setFeatureFlag(
  flag: FeatureFlag,
  config: Partial<FeatureFlagConfig>
): void {
  featureFlagManager.setFlag(flag, config);
}

export function enableFeatureForRole(flag: FeatureFlag, role: string): void {
  const existing = featureFlagManager.getConfig(flag) || { enabled: false };
  const allowedRoles = existing.allowedRoles || [];
  if (!allowedRoles.includes(role)) {
    allowedRoles.push(role);
  }
  featureFlagManager.setFlag(flag, {
    ...existing,
    enabled: true,
    allowedRoles
  });
}

export function setRolloutPercentage(flag: FeatureFlag, percentage: number): void {
  const existing = featureFlagManager.getConfig(flag) || { enabled: false };
  featureFlagManager.setFlag(flag, {
    ...existing,
    enabled: true,
    rolloutPercentage: Math.max(0, Math.min(100, percentage))
  });
}
