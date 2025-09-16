export type AppRole = 'admin' | 'beta' | 'paid_user' | 'free_user' | 'trainer';

export type Privilege = 
  | 'admin.panel'
  | 'auth.manage'
  | 'chat.use'
  | 'onboarding.use'
  | 'nutrition.log'
  | 'workout.log'
  | 'voice.use'
  | 'agents.view'
  | 'agents.use.shoplens'
  | 'feedback.submit'
  | 'analytics.view'
  | 'clients.read'
  | 'clients.manage'
  | 'invites.send'
  | 'data.export';

export const ROLE_PRIVILEGES: Record<AppRole, Privilege[]> = {
  admin: [
    'admin.panel',
    'auth.manage',
    'chat.use',
    'onboarding.use',
    'nutrition.log',
    'workout.log',
    'voice.use',
    'agents.view',
    'agents.use.shoplens',
    'feedback.submit',
    'analytics.view',
    'clients.read',
    'clients.manage',
    'invites.send',
    'data.export'
  ],
  beta: [
    'chat.use',
    'onboarding.use',
    'nutrition.log',
    'workout.log',
    'voice.use',
    'agents.view',
    'agents.use.shoplens',
    'feedback.submit',
    'analytics.view',
    'data.export'
  ],
  paid_user: [
    'chat.use',
    'onboarding.use',
    'nutrition.log',
    'workout.log',
    'analytics.view',
    'data.export',
    'feedback.submit'
  ],
  free_user: [
    'chat.use',
    'onboarding.use',
    'nutrition.log',
    'workout.log',
    'feedback.submit'
  ],
  trainer: [
    'chat.use',
    'onboarding.use',
    'nutrition.log',
    'workout.log',
    'clients.read',
    'clients.manage',
    'analytics.view',
    'invites.send',
    'agents.view'
  ]
};

export function hasPrivilege(role: AppRole | null | undefined, privilege: Privilege): boolean {
  if (!role) return false;
  return ROLE_PRIVILEGES[role]?.includes(privilege) ?? false;
}

export function getRoleDisplayName(role: AppRole): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'beta':
      return 'Beta';
    case 'paid_user':
      return 'Paid User';
    case 'free_user':
      return 'Free User';
    case 'trainer':
      return 'Trainer';
    default:
      return role;
  }
}