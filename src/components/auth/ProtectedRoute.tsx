import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase';
import BetaHoldGuard from '../BetaHoldGuard';

interface DebugInfo {
  userEmail: string | null;
  isAdmin: boolean;
  isPaidUser: boolean;
  isBetaUser: boolean;
  sourceFields: {
    profilesRole: string | null;
    profilesBetaUser: boolean | null;
    appMetadataRole: any;
    appMetadataBeta: any;
  };
}

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [loading, setLoading] = useState(true);
  const [hasUser, setHasUser] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!alive) return;
        
        if (!user) {
          setHasUser(false);
          setDebugInfo({
            userEmail: null,
            isAdmin: false,
            isPaidUser: false,
            isBetaUser: false,
            sourceFields: {
              profilesRole: null,
              profilesBetaUser: null,
              appMetadataRole: null,
              appMetadataBeta: null,
            }
          });
          setLoading(false);
          return;
        }

        setHasUser(true);

        // Check user's role and beta status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, user_id, role, beta_user')
          .eq('id', user.id)
          .maybeSingle();

        console.log('[Gate:ProfileRow]', profile);

        if (!alive) return;

        if (error) {
          console.error('Error fetching user profile:', error);
          setHasAccess(false);
          setDebugInfo({
            userEmail: user.email || null,
            isAdmin: false,
            isPaidUser: false,
            isBetaUser: false,
            sourceFields: {
              profilesRole: null,
              profilesBetaUser: null,
              appMetadataRole: user.app_metadata?.role || null,
              appMetadataBeta: user.app_metadata?.beta || null,
            }
          });
          setLoading(false);
          return;
        }

        // Access control logic:
        // 1. Admin users have full access
        // 2. Beta users have access during testing
        // 3. Everyone else is blocked
        const isAdmin = profile?.role === 'admin';
        const isPaidUser = profile?.role === 'paid_user';
        const isBetaUser = profile?.beta_user === true;
        
        const allowAccess = isAdmin || isBetaUser;

        // Capture debug information
        const debug: DebugInfo = {
          userEmail: user.email || null,
          isAdmin,
          isPaidUser,
          isBetaUser,
          sourceFields: {
            profilesRole: profile?.role || null,
            profilesBetaUser: profile?.beta_user || null,
            appMetadataRole: user.app_metadata?.role || null,
            appMetadataBeta: user.app_metadata?.beta || null,
          }
        };
        
        setDebugInfo(debug);
        
        // Console log for debugging
        console.log('[ProtectedRoute Debug]', debug);
        if (import.meta.env.DEV) {
          console.log('[Gate:Access]', { 
            uid: user.id, 
            role: profile?.role, 
            beta_user: profile?.beta_user,
            isAdmin,
            isBetaUser,
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
          {(import.meta.env.DEV || !hasAccess) && debugInfo && (
            <div className="absolute top-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs font-mono max-w-xs">
              <div className="text-yellow-400 font-semibold mb-2">DEBUG INFO</div>
              <div className="space-y-1">
                <div>Email: {debugInfo.userEmail || 'no session'}</div>
                <div>isAdmin: <span className={debugInfo.isAdmin ? 'text-green-400' : 'text-red-400'}>{debugInfo.isAdmin.toString()}</span></div>
                <div>isPaidUser: <span className={debugInfo.isPaidUser ? 'text-green-400' : 'text-red-400'}>{debugInfo.isPaidUser.toString()}</span></div>
                <div>isBetaUser: <span className={debugInfo.isBetaUser ? 'text-green-400' : 'text-red-400'}>{debugInfo.isBetaUser.toString()}</span></div>
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="text-gray-400 mb-1">Source Fields:</div>
                  <div>profiles.role: {debugInfo.sourceFields.profilesRole || 'null'}</div>
                  <div>profiles.beta_user: <span className={debugInfo.sourceFields.profilesBetaUser ? 'text-green-400' : 'text-red-400'}>{debugInfo.sourceFields.profilesBetaUser?.toString() || 'null'}</span></div>
                  <div>app_metadata.role: {debugInfo.sourceFields.appMetadataRole || 'null'}</div>
                  <div>app_metadata.beta: {debugInfo.sourceFields.appMetadataBeta || 'null'}</div>
                </div>
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