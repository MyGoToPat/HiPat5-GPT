export type UserRole = 'guest' | 'user' | 'beta' | 'admin' | 'paid_user' | 'free_user' | 'trainer';

/**
 * Check if user has privileged access to chat and beta features
 * Returns true for: admin, beta, paid_user, trainer roles
 *
 * NOTE: This checks ROLE only. For comprehensive access control that also
 * checks the beta_user flag, use hasPatAccess() from acl.ts
 */
export function isPrivileged(role: UserRole | null): boolean {
  return role === 'admin' || role === 'beta' || role === 'paid_user' || role === 'trainer';
}

export function canToggle(role: UserRole | null): boolean {
  return role === 'admin' || role === 'beta';
}

export function isAdmin(role: UserRole | null): boolean {
  return role === 'admin';
}

export function canCreateRoles(role: UserRole | null): boolean {
  return isAdmin(role);
}

export function canManageSwarms(role: UserRole | null): boolean {
  return isAdmin(role);
}