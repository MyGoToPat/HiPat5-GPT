import React, { useState, useEffect } from 'react';
import { AppBar } from '../components/AppBar';
import { NavigationSidebar } from '../components/NavigationSidebar';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/user';
import { RefreshCw, Database, User, Shield, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface DebugPageProps {
  onNavigate: (page: string) => void;
  userProfile: UserProfile | null;
}

interface DebugData {
  session: any;
  user: any;
  userRole: string | null;
  profileData: any;
  rpcError: string | null;
  timestamp: Date;
}

export const DebugPage: React.FC<DebugPageProps> = ({ onNavigate, userProfile }) => {
  const [showNavigation, setShowNavigation] = useState(false);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('DebugPage: Starting debug data fetch...');
      
      // Get session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('DebugPage: Session data:', sessionData, 'Session error:', sessionError);
      
      // Get user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log('DebugPage: User data:', userData, 'User error:', userError);
      
      // Get user role via RPC
      let userRole: string | null = null;
      let rpcError: string | null = null;
      
      try {
        console.log('DebugPage: Calling get_user_role RPC...');
        const { data: roleData, error: roleError } = await supabase.rpc('get_user_role');
        console.log('DebugPage: Role data:', roleData, 'Role error:', roleError);
        
        if (roleError) {
          rpcError = `RPC Error: ${roleError.message}`;
          console.error('DebugPage: RPC error:', roleError);
        } else {
          userRole = roleData;
        }
      } catch (rpcException) {
        rpcError = `RPC Exception: ${rpcException instanceof Error ? rpcException.message : String(rpcException)}`;
        console.error('DebugPage: RPC exception:', rpcException);
      }
      
      // Get profile data directly
      let profileData = null;
      if (userData.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userData.user.id)
            .single();
          
          if (profileError) {
            console.error('DebugPage: Profile fetch error:', profileError);
            profileData = { error: profileError.message };
          } else {
            profileData = profile;
          }
        } catch (profileException) {
          console.error('DebugPage: Profile fetch exception:', profileException);
          profileData = { error: profileException instanceof Error ? profileException.message : String(profileException) };
        }
      }
      
      setDebugData({
        session: sessionData,
        user: userData,
        userRole,
        profileData,
        rpcError,
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error('DebugPage: Fetch error:', error);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  const getStatusIcon = (hasData: boolean, hasError: boolean) => {
    if (hasError) return <AlertTriangle size={16} className="text-red-500" />;
    if (hasData) return <CheckCircle size={16} className="text-green-500" />;
    return <Info size={16} className="text-gray-500" />;
  };

  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavigationSidebar 
        isOpen={showNavigation} 
        onClose={() => setShowNavigation(false)} 
        onNavigate={onNavigate}
        onNewChat={() => onNavigate('chat')}
        userProfile={userProfile}
      />
      
      <AppBar 
        title="Debug Panel" 
        onBack={() => onNavigate('dashboard')}
        onMenu={() => setShowNavigation(true)}
        showBack
      />
      
      <div className="px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Database size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Supabase Debug Panel</h1>
              <p className="text-gray-400">Diagnostic information for backend connection</p>
            </div>
          </div>
          <button
            onClick={fetchDebugData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(!!debugData?.session?.session, !!debugData?.session?.error)}
              <span className="text-sm font-medium text-gray-300">Session</span>
            </div>
            <p className="text-white font-bold">
              {debugData?.session?.session ? 'Active' : 'None'}
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(!!debugData?.user?.user, !!debugData?.user?.error)}
              <span className="text-sm font-medium text-gray-300">User</span>
            </div>
            <p className="text-white font-bold">
              {debugData?.user?.user ? 'Authenticated' : 'None'}
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(!!debugData?.userRole, !!debugData?.rpcError)}
              <span className="text-sm font-medium text-gray-300">Role RPC</span>
            </div>
            <p className="text-white font-bold">
              {debugData?.userRole || (debugData?.rpcError ? 'Error' : 'None')}
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(!!debugData?.profileData && !debugData?.profileData?.error, !!debugData?.profileData?.error)}
              <span className="text-sm font-medium text-gray-300">Profile</span>
            </div>
            <p className="text-white font-bold">
              {debugData?.profileData && !debugData?.profileData?.error ? 'Loaded' : 'Error'}
            </p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-red-300 font-medium">Error</span>
            </div>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-800">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Loading debug data...</p>
          </div>
        )}

        {/* Debug Data Display */}
        {debugData && !isLoading && (
          <div className="space-y-6">
            {/* RPC Error Display */}
            {debugData.rpcError && (
              <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="text-red-300 font-medium">RPC Function Error</span>
                </div>
                <p className="text-red-200 text-sm">{debugData.rpcError}</p>
              </div>
            )}

            {/* Session Data */}
            <div className="bg-gray-900 rounded-lg border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Session Data</h3>
                </div>
              </div>
              <div className="p-4">
                <pre className="text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">
                  {formatJson(debugData.session)}
                </pre>
              </div>
            </div>

            {/* User Data */}
            <div className="bg-gray-900 rounded-lg border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-green-400" />
                  <h3 className="text-lg font-semibold text-white">User Data</h3>
                </div>
              </div>
              <div className="p-4">
                <pre className="text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">
                  {formatJson(debugData.user)}
                </pre>
              </div>
            </div>

            {/* User Role RPC Result */}
            <div className="bg-gray-900 rounded-lg border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">get_user_role() RPC Result</h3>
                </div>
              </div>
              <div className="p-4">
                {debugData.rpcError ? (
                  <div className="text-red-400 text-sm">
                    <p className="font-medium mb-2">Error calling get_user_role():</p>
                    <p>{debugData.rpcError}</p>
                  </div>
                ) : (
                  <div className="text-gray-300">
                    <p className="text-sm mb-2">Role from database:</p>
                    <pre className="text-lg font-mono text-green-400">
                      {debugData.userRole ? `"${debugData.userRole}"` : 'null'}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Data */}
            <div className="bg-gray-900 rounded-lg border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">Profile Data (Direct Query)</h3>
                </div>
              </div>
              <div className="p-4">
                <pre className="text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">
                  {formatJson(debugData.profileData)}
                </pre>
              </div>
            </div>

            {/* Frontend State */}
            <div className="bg-gray-900 rounded-lg border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-400" />
                  <h3 className="text-lg font-semibold text-white">Frontend State</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">UserProfile Role:</span>
                    <span className="text-white font-mono">{userProfile?.role || 'null'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">UserProfile Name:</span>
                    <span className="text-white font-mono">{userProfile?.name || 'null'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">UserProfile Email:</span>
                    <span className="text-white font-mono">{userProfile?.email || 'null'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Beta User:</span>
                    <span className="text-white font-mono">{userProfile?.beta_user ? 'true' : 'false'}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <h4 className="text-white font-medium mb-2">Full UserProfile Object:</h4>
                  <pre className="text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap">
                    {formatJson(userProfile)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="bg-gray-900 rounded-lg border border-gray-800">
              <div className="p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-orange-400" />
                  <h3 className="text-lg font-semibold text-white">Environment Configuration</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Supabase URL:</span>
                    <span className="text-white font-mono text-xs">
                      {import.meta.env.VITE_SUPABASE_URL ? 
                        `${import.meta.env.VITE_SUPABASE_URL.substring(0, 30)}...` : 
                        'Not set'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Anon Key:</span>
                    <span className="text-white font-mono text-xs">
                      {import.meta.env.VITE_SUPABASE_ANON_KEY ? 
                        `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 20)}...` : 
                        'Not set'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Results Summary */}
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6 border border-blue-700">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={20} className="text-green-400" />
                <h3 className="text-lg font-semibold text-white">Connection Test Results</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(!!debugData.session?.session, !!debugData.session?.error)}
                    <span className="text-sm text-gray-300">
                      Supabase Authentication: {debugData.session?.session ? 'Connected' : 'Not Connected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(!!debugData.user?.user, !!debugData.user?.error)}
                    <span className="text-sm text-gray-300">
                      User Session: {debugData.user?.user ? 'Active' : 'None'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(!!debugData.userRole, !!debugData.rpcError)}
                    <span className="text-sm text-gray-300">
                      Role Function: {debugData.userRole ? 'Working' : 'Error'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(!!debugData.profileData && !debugData.profileData?.error, !!debugData.profileData?.error)}
                    <span className="text-sm text-gray-300">
                      Profile Access: {debugData.profileData && !debugData.profileData?.error ? 'Working' : 'Error'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-800">
                <p className="text-blue-200 text-sm">
                  Last updated: {debugData.timestamp.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};