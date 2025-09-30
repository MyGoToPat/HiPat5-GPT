import React from 'react';
import { TalkingPatPage1 } from '../components/TalkingPatPage1';
import { getSupabase } from '../lib/supabase';
import { hasPatAccess, type AclProfile } from '../lib/access/acl';
import { ArrowLeft, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


export default function VoicePage() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any | null>(null);
  const [profile, setProfile] = React.useState<AclProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    const fetchAuthData = async () => {
      const supabase = getSupabase();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, beta_user')
          .eq('id', authUser.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        }
        
        setProfile(profileData as AclProfile | null);
      }
      setLoading(false);
    };
    fetchAuthData();
  }, []);

  if (loading || !user || !profile || !hasPatAccess(user, profile)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic size={24} className="text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">Your role doesn't allow access to voice features yet.</p>
          
          {/* Debug Panel - DEV ONLY */}
          {import.meta.env.DEV && user && profile && (
            <div className="absolute top-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs font-mono max-w-xs">
              <div className="text-yellow-400 font-semibold mb-2">DEBUG INFO</div>
              <div className="space-y-1">
                <div>email: {user?.email || 'null'}</div>
                <div>role: {profile?.role || 'null'}</div>
                <div>beta_user: <span className={profile?.beta_user === true ? 'text-green-400' : 'text-red-400'}>{profile?.beta_user?.toString() || 'null'}</span></div>
                <div>appMeta.role: {user?.app_metadata?.role || 'null'}</div>
                <div>appMeta.beta: <span className={user?.app_metadata?.beta === true ? 'text-green-400' : 'text-red-400'}>{user?.app_metadata?.beta?.toString() || 'null'}</span></div>
                <div>appMeta.paid: <span className={user?.app_metadata?.paid === true ? 'text-green-400' : 'text-red-400'}>{user?.app_metadata?.paid?.toString() || 'null'}</span></div>
                <div>allowAccess: <span className={hasPatAccess(user, profile) ? 'text-green-400' : 'text-red-400'}>{hasPatAccess(user, profile).toString()}</span></div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <TalkingPatPage1 />;
}