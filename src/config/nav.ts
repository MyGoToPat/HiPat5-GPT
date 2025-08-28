export type NavRole = 'user' | 'admin' | 'trainer';
export type NavItem = { label: string; to: string; roles?: NavRole[] };

export const NAV_ITEMS: NavItem[] = [
  { label: 'New chat',         to: '/chat',              roles: ['user','admin','trainer'] },
  { label: 'Dashboard',        to: '/dashboard',         roles: ['user','admin','trainer'] },
  { label: 'Profile',          to: '/profile',           roles: ['user','admin','trainer'] },
  { label: 'Client Management',to: '/trainer-dashboard', roles: ['admin','trainer'] },
  { label: 'Admin',            to: '/admin',             roles: ['admin'] },
  { label: 'Agents',           to: '/agents',            roles: ['admin','trainer','user'] },
  { label: 'Admin Agents',     to: '/admin/agents',      roles: ['admin'] },
  { label: 'TDEE Calculator',  to: '/tdee',              roles: ['user','admin','trainer'] },
] as const;