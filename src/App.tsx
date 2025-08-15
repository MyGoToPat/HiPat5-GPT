import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseDebugConfig } from './lib/supabase';
import { UserProfile } from './types/user';
import AppLayout from './layouts/AppLayout';
import { analytics } from './lib/analytics';
import { TimerProvider } from './context/TimerContext';
import AdminPage from './pages/AdminPage';

// Import page components
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import VoicePage from './pages/VoicePage';
import CameraPage from './pages/CameraPage';
import TDEEOnboardingWizard from './pages/TDEEOnboardingWizard';
import IntervalTimerPage from './pages/IntervalTimerPage';
import TrainerDashboardPage from './pages/TrainerDashboardPage';
import DebugPage from './pages/DebugPage';
import NotFoundPage from './pages/NotFoundPage';
import AgentsListPage from './pages/admin/AgentsListPage';
import AgentDetailPage from './pages/admin/AgentDetailPage';

// Helper: programmatic nav to replace any prior string-based onNavigate
export function useNav() {
  const navigate = useNavigate();
  return (path: string) => navigate(path);
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Protected route wrapper with explicit props
  function ProtectedRoute({
    children,
    loading,
    isAuthenticated,
  }: {
    children: React.ReactNode;
    loading: boolean;
    isAuthenticated: boolean;
  }) {
    if (loading) return null;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
  }

  // Safe role-aware post-login redirect
  const postLoginRedirect = async () => {
    try {
      // Dev visibility: confirm env is correct
      if (import.meta.env.DEV) {
        const dbg = supabaseDebugConfig();
        console.log('Supabase config', { url: dbg.url, anonTail: dbg.anonTail, hasKey: dbg.hasKey });
      }

      // Prefer local session to avoid unnecessary network calls
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user ?? null;

      if (!user) {
        try {
          const { data: { user: fetchedUser } } = await supabase.auth.getUser();
          user = fetchedUser ?? null;
        } catch (e: any) {
          // Swallow transient network issues and continue to default route
          if (import.meta.env.DEV) console.warn('getUser failed, continuing to default route', e?.message || e);
        }
      }

      let dest = '/dashboard';

      if (user) {
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .select('role, created_at')
          .eq('user_id', user.id)
          .maybeSingle();

        if (pErr && import.meta.env.DEV) console.warn('profiles read error', pErr);
        const role = profile?.role ?? 'user';

        if (role === 'admin') {
          dest = '/admin';
        } else if (role === 'trainer') {
          dest = '/trainer-dashboard';
        } else {
          const { data: um, error: umErr } = await supabase
            .from('user_metrics')
            .select('tdee')
            .eq('user_id', user.id)
            .maybeSingle();

          if (umErr && import.meta.env.DEV) console.warn('user_metrics read error', umErr);
          dest = um?.tdee ? '/dashboard' : '/tdee';
        }
      }

      navigate(dest, { replace: true });
    } catch (e) {
      console.error('postLoginRedirect failed', e);
      navigate('/dashboard', { replace: true });
    }
  };

  // Initialize analytics
  useEffect(() => {
    analytics.init();
    console.log('Initializing analytics...');
  }, []);

  // Set up iOS viewport height fix
  React.useEffect(() => {
    setVHProperty();
    
    const handleResize = () => {
      setVHProperty();
    };
    
    const handleOrientationChange = () => {
      setTimeout(setVHProperty, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Helper to set --vh property for iOS Safari
  const setVHProperty = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // RLS-friendly auth/profile bootstrap
  const handleUserSignIn = async (session: Session) => {
    try {
      const user = session.user;
      if (!user) return;

      // 1) Read existing profile (RLS-safe; null if absent)
      const { data: profile, error: selError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (selError) throw selError;

      let current = profile;

      // 2) Create if missing (allowed by owner policy)
      if (!current) {
        const { data, error: upsertError } = await supabase
          .from('profiles')
          .upsert(
            {
              user_id: user.id,
              email: user.email ?? null,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              beta_user: false,
              role: 'free_user'
            },
            { onConflict: 'user_id' }
          )
          .select('*')
          .single();
        if (upsertError) throw upsertError;
        current = data;

        // Track new user signup for new profiles
        analytics.trackEvent('user_signed_up', { user_id: user.id });
      } else {
        // Track daily active user for existing profiles
        analytics.trackEvent('daily_active_user', { user_id: user.id });
      }

      // 3) Persist to app state
      setUserProfile(current as UserProfile);
      setIsAuthenticated(true);
      setLoading(false);

      // Role-aware redirect
      await postLoginRedirect();

      // Set user properties for analytics
      analytics.identifyUser(user.id);
      analytics.setUserProperties({
        beta_user: current?.beta_user,
        role: current?.role,
      });

    } catch (e) {
      console.error('handleUserSignIn:', e);
      setError(`Login failed: ${e instanceof Error ? e.message : String(e)}. Please try again.`);
      setIsAuthenticated(false);
      setUserProfile(null);
      navigate('/login');
      setLoading(false);
    }
  };

  // Handle user sign-in/sign-up events
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
        if (session) await handleUserSignIn(session);
      }
      if (_event === 'SIGNED_OUT') {
        handleUserSignOut();
      }
    });

    // Initial session check
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await handleUserSignIn(session);
      else setLoading(false);
    })();

    return () => sub?.data.subscription.unsubscribe();
  }, []);

  const handleUserSignOut = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    navigate('/login');
    setLoading(false);
    setError(null);
  };

  // Create onNavigate wrapper for components that still use string-based navigation
  const createOnNavigateWrapper = () => {
    return (page: string, state?: { autoStartMode?: 'takePhoto' | 'videoStream' }) => {
      switch (page) {
        case 'dashboard': navigate('/dashboard'); break;
        case 'profile': navigate('/profile'); break;
        case 'chat': navigate('/chat'); break;
        case 'voice': navigate('/voice'); break;
        case 'camera': navigate('/camera', { state }); break;
        case 'tdee-wizard': navigate('/tdee'); break;
        case 'interval-timer': navigate('/interval-timer'); break;
        case 'trainer-dashboard': navigate('/trainer-dashboard'); break;
        case 'debug': navigate('/debug'); break;
        case 'admin': navigate('/admin'); break;
        case 'login': navigate('/login'); break;
        case 'register': navigate('/register'); break;
        case 'forgot-password': navigate('/forgot-password'); break;
        default: navigate('/dashboard');
      }
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading HiPat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-900 text-white flex items-center justify-center p-4">
        <div className="text-center bg-red-800 p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                  handleUserSignIn(session);
                } else {
                  setLoading(false);
                }
              });
            }}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <TimerProvider>
      <div className="App">
        <Routes>
          {/* Public auth routes */}
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage onNavigate={createOnNavigateWrapper()} /> : <Navigate to="/dashboard" replace />}
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? <RegisterPage onNavigate={createOnNavigateWrapper()} /> : <Navigate to="/dashboard" replace />}
          />
          <Route 
            path="/forgot-password" 
            element={!isAuthenticated ? <ForgotPasswordPage onNavigate={createOnNavigateWrapper()} /> : <Navigate to="/dashboard" replace />}
          />

          {/* Authenticated shell with global navigation */}
          <Route
            path="/"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="voice" element={<VoicePage />} />
            <Route path="camera" element={<CameraPage />} />
            <Route path="tdee" element={<TDEEOnboardingWizard onComplete={() => navigate('/dashboard')} />} />
            <Route path="interval-timer" element={<IntervalTimerPage />} />
            <Route path="trainer-dashboard" element={<TrainerDashboardPage userProfile={userProfile} />} />
            <Route path="debug" element={<DebugPage userProfile={userProfile} />} />
            <Route path="admin">
              <Route index element={<AdminPage />} />
              <Route path="agents" element={<AgentsListPage />} />
              <Route path="agents/:agentId" element={<AgentDetailPage />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Routes>
      </div>
    </TimerProvider>
  );
}

export default App;