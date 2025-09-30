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
              profilesBetaUser: null, // from beta_user column
              profilesIsBeta: null, // from is_beta column
              profilesIsPaid: null, // from is_paid column
              appMetadataRole: null,
              appMetadataBeta: null, // from app_metadata.beta
              appMetadataPaid: null, // from app_metadata.paid
            }
          });
          setLoading(false);
          return;
        }

        setHasUser(true);

        // Check user's role and beta status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, user_id, role, beta_user, is_beta, is_paid')
          .eq('id', user.id)
          .maybeSingle();
        setProfile(profileData as AclProfile | null);

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
              profilesBetaUser: null, // from beta_user column
              profilesIsBeta: null, // from is_beta column
              profilesIsPaid: null, // from is_paid column
              appMetadataRole: user.app_metadata?.role || null,
              appMetadataBeta: user.app_metadata?.beta || null, // from app_metadata.beta
              appMetadataPaid: user.app_metadata?.paid || null, // from app_metadata.paid
            }
          });
          setLoading(false);
          return;
        }

        // Access control logic:
        const allowAccess = hasPatAccess(user, profileData as AclProfile);

        // Capture debug information
        const debug: DebugInfo = {
          userEmail: user.email || null,
          isAdmin: hasPatAccess(user, profileData as AclProfile), // Re-evaluate for debug display
          isPaidUser: (profileData?.role === 'paid_user' || (profileData as AclProfile)?.is_paid === true || user.app_metadata?.paid === true),
          isBetaUser: ((profileData as AclProfile)?.beta_user === true || (profileData as AclProfile)?.is_beta === true || user.app_metadata?.beta === true),
          sourceFields: {
            profilesRole: profileData?.role || null,
            profilesBetaUser: (profileData as AclProfile)?.beta_user || null, // from beta_user column
            profilesIsBeta: (profileData as AclProfile)?.is_beta || null, // from is_beta column
            profilesIsPaid: (profileData as AclProfile)?.is_paid || null, // from is_paid column
            appMetadataRole: user.app_metadata?.role || null,
            appMetadataBeta: user.app_metadata?.beta || null, // from app_metadata.beta
            appMetadataPaid: user.app_metadata?.paid || null, // from app_metadata.paid
          }
        };
        
        setDebugInfo(debug);
        
        // Console log for debugging
        console.log('[ProtectedRoute Debug]', debug);
        if (import.meta.env.DEV) {
          console.log('[Gate:Access]', { 
            uid: user.id,
            role: profileData?.role,
            beta_user: (profileData as AclProfile)?.beta_user,
            is_beta: (profileData as AclProfile)?.is_beta,
            is_paid: (profileData as AclProfile)?.is_paid,
            isAdmin: debug.isAdmin,
            isBetaUser: debug.isBetaUser,
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
          {(import.meta.env.DEV || !hasAccess) && debugInfo && user && profile && (
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
                  <div>profiles.beta_user: <span className={debugInfo.sourceFields.profilesBetaUser === true ? 'text-green-400' : 'text-red-400'}>{debugInfo.sourceFields.profilesBetaUser?.toString() || 'null'}</span></div>
                  <div>profiles.is_beta: <span className={debugInfo.sourceFields.profilesIsBeta === true ? 'text-green-400' : 'text-red-400'}>{debugInfo.sourceFields.profilesIsBeta?.toString() || 'null'}</span></div>
                  <div>profiles.is_paid: <span className={debugInfo.sourceFields.profilesIsPaid === true ? 'text-green-400' : 'text-red-400'}>{debugInfo.sourceFields.profilesIsPaid?.toString() || 'null'}</span></div>
                  <div>app_metadata.role: {debugInfo.sourceFields.appMetadataRole || 'null'}</div>
                  <div>app_metadata.beta: <span className={debugInfo.sourceFields.appMetadataBeta === true ? 'text-green-400' : 'text-red-400'}>{debugInfo.sourceFields.appMetadataBeta?.toString() || 'null'}</span></div>
                  <div>app_metadata.paid: <span className={debugInfo.sourceFields.appMetadataPaid === true ? 'text-green-400' : 'text-red-400'}>{debugInfo.sourceFields.appMetadataPaid?.toString() || 'null'}</span></div>
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