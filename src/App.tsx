import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TimerProvider } from './context/TimerContext';
import { initAnalytics } from './lib/analytics';
import { ensureProfile } from './lib/profiles';
import { getSupabase } from './lib/supabase';
import { getSession, onAuthChange } from './lib/auth';
import { useOrgStore } from './store/org';

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
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import Health from './pages/Health';
import AgentsListPage from './pages/admin/AgentsListPage';
import AgentDetailPage from './pages/admin/AgentDetailPage';
import AppLayout from './layouts/AppLayout';
import { UserProfile } from './types/user';

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Safe role-aware post-login redirect
  const postLoginRedirect = async () => {
    try {
      const supabase = getSupabase();
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
          const { data: um, error: umErr } = await getSupabase()
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

  // Handle user sign-in events
  const handleUserSignIn = async (session: any) => {
    if (!session?.user) {
      console.warn('[Auth] handleUserSignIn called without session.user, skipping.');
      return;
    }
    
    try {
      const user = session.user;

      // Read existing profile (RLS-safe; null if absent)
      const { data: profile, error: selError } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (selError) throw selError;

      let current = profile;

      // Create if missing (allowed by owner policy)
      if (!current) {
        const { data, error: upsertError } = await getSupabase()
          .from('profiles')
          .upsert(
            {
              user_id: user.id,
              email: user.email ?? null,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              beta_user: false,
              role: 'user'
            },
            { onConflict: 'user_id' }
          )
          .select('*')
          .single();
        if (upsertError) throw upsertError;
        current = data;
      }

      // Persist to app state
      setUserProfile(current as UserProfile);
      setHasSession(true);

      // Bootstrap org store
      setTimeout(() => useOrgStore.getState().init(), 0);

      console.log('[auth] user profile loaded:', current?.role);

    } catch (e) {
      console.error('handleUserSignIn:', e);
      setError(`Login failed: ${e instanceof Error ? e.message : String(e)}. Please try again.`);
      setHasSession(false);
      setUserProfile(null);
    }
  };

  // Non-blocking boot: never wait for profile/org/flags to render the app
  useEffect(() => {
    initAnalytics();

    let mounted = true;

    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const authed = !!session?.user;
      console.log('[app] initial session:', { authed, path: location.pathname });
      setHasSession(authed);
      if (session?.user) {
        // fire-and-forget profile bootstrap; do NOT block UI
        setTimeout(() => {
          ensureProfile(session.user!.id, session.user!.email ?? undefined);
          handleUserSignIn(session);
        }, 0);
      }
      setAuthReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      const authed = !!session?.user;
      console.log('[app] auth event:', event, 'authed:', authed, 'path:', location.pathname);
      setHasSession(authed);
      
      if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        navigate('/login', { replace: true });
        return;
      }

      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        setTimeout(() => {
          ensureProfile(session.user!.id, session.user!.email ?? undefined);
          handleUserSignIn(session);
        }, 0);
      }

      // Robust redirect: if we sign in, leave any login-ish path immediately
      if (event === 'SIGNED_IN') {
        const p = location.pathname.toLowerCase();
        if (p === '/' || p.includes('login') || p.includes('signin') || p.includes('auth')) {
          console.log('[app] SIGNED_IN on auth page → redirecting to app');
          await postLoginRedirect();
        }
      }
    });

    // Failsafe unlock so UI never blocks
    const t = setTimeout(() => setAuthReady(true), 3000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(t);
      mounted = false;
    };
  }, [location.pathname, navigate]);

  // Post-auth redirect from /login if already authenticated
  useEffect(() => {
    if (!authReady) return;
    getSession().then((s) => {
      if (s?.user && (location.pathname === '/login' || location.pathname === '/signin')) {
        console.log('[app] authenticated user on /login → redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    });
  }, [authReady, location.pathname, navigate]);

  // While we're doing the very first session check, show spinner
  if (!authReady) {
    return (
      <div className="min-h-dvh grid place-items-center bg-gray-950 text-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading HiPat…</p>
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
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // SESSION-ONLY gate at the ROUTE level (not on org/profile/flags)
  const isAuthed = hasSession === true;

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

  return (
    <TimerProvider>
      <ErrorBoundary>
        <Toaster position="top-right" />
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route 
            path="/login" 
            element={!isAuthed ? <LoginPage /> : <Navigate to="/dashboard" replace />}
          />
          <Route 
            path="/signin" 
            element={!isAuthed ? <LoginPage /> : <Navigate to="/dashboard" replace />}
          />
          <Route 
            path="/register" 
            element={!isAuthed ? <RegisterPage onNavigate={createOnNavigateWrapper()} /> : <Navigate to="/dashboard" replace />}
          />
          <Route 
            path="/forgot-password" 
            element={!isAuthed ? <ForgotPasswordPage onNavigate={createOnNavigateWrapper()} /> : <Navigate to="/dashboard" replace />}
          />
          <Route path="/health" element={<Health />} />

          {/* PROTECTED ROUTES — use session-only guard */}
          <Route
            path="/"
            element={
              isAuthed ? <AppLayout /> : <Navigate to="/login" replace />
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

          {/* FALLBACK: if authed go dashboard, else go login */}
          <Route path="*" element={isAuthed ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    </TimerProvider>
  );
}

export default App;