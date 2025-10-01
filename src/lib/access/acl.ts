export type AclProfile = { role?: string | null; beta_user?: boolean | null };

export function hasPatAccess(user: any, profile: AclProfile): boolean {
  const email = (user?.email || '').toLowerCase();
  const appRole = user?.app_metadata?.role;
  const appBeta = user?.app_metadata?.beta === true;
  const appPaid = user?.app_metadata?.paid === true;

  const role = profile?.role;
  const isAdmin = role === 'admin' || appRole === 'admin' || email === 'info@hipat.app';
  const isPaidUser = role === 'paid_user' || appPaid;
  const isBetaUser = profile?.beta_user === true || appBeta;

  // Check if user has confirmed their email
  const isConfirmed = user?.email_confirmed_at != null;

  // Allow access if: admin, OR (paid AND beta), OR confirmed email
  return isAdmin || (isPaidUser && isBetaUser) || isConfirmed;
}