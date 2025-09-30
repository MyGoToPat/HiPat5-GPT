import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import { hasPatAccess, type AclProfile } from '../../lib/access/acl';
import BetaHoldGuard from '../BetaHoldGuard';

interface DebugInfo {
  userEmail: string | null;
  isAdmin: boolean;
  isPaidUser: boolean;
  isBetaUser: boolean;
  sourceFields: {
    profilesRole: string | null;
    profilesBetaUser: boolean | null; // from beta_user column
    profilesIsBeta: boolean | null; // from is_beta column
    profilesIsPaid: boolean | null; // from is_paid column
    appMetadataRole: any;
    appMetadataBeta: any; // from app_metadata.beta
    appMetadataPaid: any; // from app_metadata.paid
  };
}

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [profile, setProfile] = useState<AclProfile | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
        
        if (!alive) return;
        
        if (userError || !authUser) {
          setHasUser(false);
          setLoading(false);
          return;
        }

        setUser(authUser);
        setHasUser(true);

        // Fetch profile with correct key and minimal fields
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, role, beta_user, is_beta, is_paid')
          .eq('id', authUser.id)
          .maybeSingle();

        console.log('[Gate:ProfileRow]', profileData);

        if (!alive) return;

        if (error) {
          console.error('Error fetching user profile:', error);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        setProfile(profileData as AclProfile | null);
        
        // Centralized access control
        const allowAccess = hasPatAccess(authUser, profileData as AclProfile);
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
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center relative">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Chat Access Restricted</h2>
          <p className="text-gray-600 mb-6">Chat limited to Admins and Beta users during testing.</p>
          <p className="text-gray-500 text-sm">Contact your administrator for access or wait for general availability.</p>
          
          {/* Debug Panel - DEV ONLY */}
          {import.meta.env.DEV && user && profile && (
            <div className="absolute top-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs font-mono max-w-xs">
              <div className="text-yellow-400 font-semibold mb-2">DEBUG INFO</div>
              <div className="space-y-1">
                <div>email: {user?.email || 'null'}</div>
                <div>role: {profile?.role || 'null'}</div>
                <div>beta_user: <span className={profile?.beta_user === true ? 'text-green-400' : 'text-red-400'}>{profile?.beta_user?.toString() || 'null'}</span></div>
                <div>is_beta: <span className={profile?.is_beta === true ? 'text-green-400' : 'text-red-400'}>{profile?.is_beta?.toString() || 'null'}</span></div>
                <div>is_paid: <span className={profile?.is_paid === true ? 'text-green-400' : 'text-red-400'}>{profile?.is_paid?.toString() || 'null'}</span></div>
                <div>appMeta.role: {user?.app_metadata?.role || 'null'}</div>
                <div>appMeta.beta: <span className={user?.app_metadata?.beta === true ? 'text-green-400' : 'text-red-400'}>{user?.app_metadata?.beta?.toString() || 'null'}</span></div>
                <div>appMeta.paid: <span className={user?.app_metadata?.paid === true ? 'text-green-400' : 'text-red-400'}>{user?.app_metadata?.paid?.toString() || 'null'}</span></div>
                <div>allowAccess: <span className={hasAccess ? 'text-green-400' : 'text-red-400'}>{hasAccess.toString()}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <BetaHoldGuard>
      {children}
    </BetaHoldGuard>
  );
}