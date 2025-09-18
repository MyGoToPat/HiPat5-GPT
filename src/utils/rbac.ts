export type UserRole = 'guest' | 'user' | 'beta' | 'admin' | 'paid_user' | 'free_user' | 'trainer';

export function isPrivileged(role: UserRole | null): boolean {
  return role === 'admin' || role === 'beta';
}

export function canToggle(role: UserRole | null): boolean {
  return role === 'admin' || role === 'beta';
}