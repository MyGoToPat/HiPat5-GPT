import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import BetaHoldGuard from '../BetaHoldGuard';

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!alive) return;
        
        if (!user) {
          setHasUser(false);
          setLoading(false);
          return;
        }

        setHasUser(true);

        // Check user's role and beta status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, beta_user')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          console.error('Error fetching user profile:', error);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Access control logic:
        // 1. Admin users have full access
        // 2. Paid users with beta_user = true have access
        // 3. Everyone else is blocked
        const isAdmin = profile?.role === 'admin';
        const isPaidBetaUser = profile?.role === 'paid_user' && profile?.beta_user === true;
        
        const allowAccess = isAdmin || isPaidBetaUser;

        if (import.meta.env.DEV) {
          console.log('[Gate:Access]', { 
            uid: user.id, 
            role: profile?.role, 
            beta_user: profile?.beta_user,
            isAdmin,
            isPaidBetaUser,
            allowAccess 
          });
        }

        setHasAccess(allowAccess);
        setLoading(false);
      } catch (error) {
        console.error('ProtectedRoute error:', error);
        if (alive) {
          setHasAccess(false);
          setLoading(false);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!hasUser) return <Navigate to="/login" replace />;
  if (!hasAccess) return <Navigate to="/beta-pending" replace />;

  return (
    <BetaHoldGuard>
      {children}
    </BetaHoldGuard>
  );
}