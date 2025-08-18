import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { ensureProfile } from './lib/profiles';
import { getSession } from './lib/auth';
import { UserProfile } from './types/user';
import AppLayout from './layouts/AppLayout';
import { analytics, initAnalytics } from './lib/analytics';
import { TimerProvider } from './context/TimerContext';
import { useOrgStore } from './store/org';
import AdminPage from './pages/AdminPage';

// Import the new auth helpers
import { getSession, onAuthChange } from './lib/auth';

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false); // Keep for internal use if needed, but not for initial gate
  const location = useLocation();
  
  // Post-auth redirect if user lands on /login after startup
  useEffect(() => {
    // If already authenticated and currently on /login, bounce to dashboard
    if (!authReady) return;
    getSession().then((s) => {
      if (s?.user && (location.pathname === '/login' || location.pathname === '/signin')) {
        console.log('[app] authenticated user on /login → redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    });
  }, [authReady, location.pathname, navigate]);

  // Protected route wrapper with explicit props
  function ProtectedRoute({
    children,
    isAuthenticated,
  }: {
    children: React.ReactNode;
    isAuthenticated: boolean;
  }) {
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
  }

  // Safe role-aware post-login redirect
  const postLoginRedirect = async () => {
    try {
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
    initAnalytics();

    let mounted = true;
    
    // Immediate session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[app] initial getSession →', { session: !!session, user: session?.user?.id });
      if (!mounted) return;
      const u = session?.user;
      if (u) {
        setTimeout(() => ensureProfile(u.id, u.email ?? undefined), 0);
        handleUserSignIn(session);
      }
      setAuthReady(true); // never block render on data stores
    });
    
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        handleUserSignOut();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // Some environments emit INITIAL_SESSION with null; resolve explicitly. 
        console.log('[app] auth event:', event, 'user:', session?.user?.id);
        let s = session;
        if (!s?.user) {
          const { data } = await supabase.auth.getSession();
          s = data?.session ?? null;
        }
        if (!cancelled) {
          await handleUserSignIn(s);
        }
        if (!cancelled) {
          setAuthReady(true);
        }
        // If you land on /login and we just signed in, push to the app
        if (event === 'SIGNED_IN' && (location.pathname === '/login' || location.pathname === '/signin')) {
          console.log('[app] SIGNED_IN on /login → redirecting to app');
          navigate('/', { replace: true });
          setTimeout(() => navigate('/dashboard', { replace: true }), 50);
        }
      }
    });
    
    // Failsafe: even if getSession is slow, unlock UI after 3s
    const t = setTimeout(() => setAuthReady(true), 3000);
    return () => {
      cancelled = true;
      mounted = false;
      clearTimeout(t);
      try {
        sub.subscription.unsubscribe();
      } catch {}
    };
  }, [location.pathname, navigate]);

  // Post-auth redirect from /login
  useEffect(() => {
    if (!authReady) return;
    getSession().then((session) => {
      if (session?.user && (location.pathname === '/login' || location.pathname === '/signin')) {
        navigate('/dashboard', { replace: true });
      }
    });
  }, [authReady, location.pathname, navigate]);

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
  async function handleUserSignIn(session: Session | null) {
    if (!session?.user) {
      console.warn('[Auth] handleUserSignIn called without session.user, skipping.');
      return;
    }
    
    try {
      const user = session.user;

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

        // Track daily active user for existing profiles
        analytics.trackEvent?.('daily_active_user', { user_id: user.id });
      } else {
        // Track daily active user for existing profiles
        analytics.trackEvent?.('daily_active_user', { user_id: user.id });
      }

      // 3) Persist to app state
      setUserProfile(current as UserProfile);
      setIsAuthenticated(true);

      // run once after auth state is set
      await useOrgStore.getState().init();

      // Role-aware redirect
      await postLoginRedirect();

      // Set user properties for analytics
      analytics.identifyUser?.(user.id);
      analytics.setUserProperties?.({
        beta_user: current?.beta_user,
        role: current?.role,
      });

    } catch (e) {
      console.error('handleUserSignIn:', e);
      setError(`Login failed: ${e instanceof Error ? e.message : String(e)}. Please try again.`);
      setIsAuthenticated(false);
      setUserProfile(null);
      navigate('/login');
    }
  };

  // Handle user sign-in/sign-up events
  useEffect(() => {
    // Removed - handled in onAuthStateChange effect above
  }, []);

  // Get initial session
  useEffect(() => {
    // Removed - handled in onAuthStateChange effect above
  }, []);

  const handleUserSignOut = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    navigate('/login');
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

  if (!authReady) {
    return (
      <div className="min-h-dvh grid place-items-center text-sm text-gray-400">
        Loading HiPat…
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
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />}
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
              <ProtectedRoute isAuthenticated={isAuthenticated}>
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