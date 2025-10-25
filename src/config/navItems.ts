import { type Privilege } from './rbac';

export type NavItem = {
  key: string;
  label: string;
  path: string;              // absolute path to navigate
  section: 'primary' | 'admin' | 'utilities';
  roles?: Array<'admin' | 'trainer' | 'user'>; // if omitted, show to all
  requirePrivilege?: Privilege;
  featureFlag?: 'adminSwarmsLegacy' | 'adminSwarmsEnhanced'; // optional feature flag gate
};

export const NAV_ITEMS: NavItem[] = [
  // Primary
  { key: 'chat-new',    label: 'New chat',        path: '/chat?new=1',       section: 'primary' },
  { key: 'talk',        label: 'Talk With Pat',   path: '/voice',            section: 'primary', requirePrivilege: 'voice.use' },
  { key: 'dashboard',   label: 'Dashboard',       path: '/dashboard',        section: 'primary' },
  { key: 'profile',     label: 'Profile',         path: '/profile',          section: 'primary' },

  // Admin / Beta modules
  { key: 'client-mgmt', label: 'Client Management', path: '/trainer-dashboard', section: 'admin', roles: ['admin','trainer'], requirePrivilege: 'clients.read' },
  { key: 'role-access', label: 'Role Access',       path: '/admin/roles',       section: 'admin', roles: ['admin'], requirePrivilege: 'admin.panel' },
  { key: 'user-mgmt',   label: 'User Management',   path: '/admin/users',       section: 'admin', roles: ['admin'], requirePrivilege: 'admin.panel' },
  { key: 'swarms',      label: 'Agent Configuration',  path: '/admin/swarms',      section: 'admin', roles: ['admin'], requirePrivilege: 'admin.panel' },
  // RETIRED: Legacy Personality Editor replaced by 10-agent Personality Swarm (see Agent Configuration)
  // { key: 'personality', label: 'Personality Editor',   path: '/admin/personality', section: 'admin', roles: ['admin'], requirePrivilege: 'admin.panel' },
  // Optional
  { key: 'shoplens',    label: 'ShopLens',         path: '/admin/shoplens', section: 'admin', roles: ['admin'], requirePrivilege: 'agents.use.shoplens' },

  // Utilities
  { key: 'tdee',        label: 'TDEE Calculator',  path: '/tdee',            section: 'utilities' },
];