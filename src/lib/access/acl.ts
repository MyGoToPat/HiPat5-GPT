export type AclProfile = { role?: string | null; beta_user?: boolean | null; is_beta?: boolean | null; is_paid?: boolean | null };

export function hasPatAccess(user: any, profile: AclProfile): boolean {
  const email = (user?.email || '').toLowerCase();
  const appRole = user?.app_metadata?.role;
  const appBeta = user?.app_metadata?.beta === true;
  const appPaid = user?.app_metadata?.paid === true;

  const role = profile?.role;
  const isAdmin = role === 'admin' || appRole === 'admin' || email === 'info@hipat.app';
  const isPaidUser = role === 'paid_user' || profile?.is_paid === true || appPaid;
  const isBetaUser = profile?.beta_user === true || profile?.is_beta === true || appBeta;

  return isAdmin || (isPaidUser && isBetaUser);
}