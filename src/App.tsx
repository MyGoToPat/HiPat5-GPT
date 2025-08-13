import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile } from './types/user';
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

  // Role-aware post-login redirect
  const postLoginRedirect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let dest = '/dashboard'; // default for non-admins

    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (prof?.role === 'admin') {
        dest = '/admin';
      } else if (prof?.role === 'trainer') {
        dest = '/trainer-dashboard';
      } else {
        // Check for user metrics (TDEE completion) for regular users
        let metrics = null;
        try {
          const { data, error } = await supabase
            .from('user_metrics')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error && error.code === 'PGRST116') {
            metrics = null;
          } else if (error) {
            throw error;
          } else {
            metrics = data;
          }
        } catch (metricsFetchError: any) {
          if (metricsFetchError?.code === 'PGRST116') {
            metrics = null;
          } else {
            throw metricsFetchError;
          }
        }
        
        if (!metrics || !metrics.tdee) {
          dest = '/tdee';
        } else {
          dest = '/dashboard';
        }
      }
    }

    navigate(dest, { replace: true });
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

  // Session timeout management (30 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    let currentTimeout: NodeJS.Timeout | null = null;

    const resetTimeout = () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }

      currentTimeout = setTimeout(async () => {
        console.log('Session timeout - signing out user');
        await supabase.auth.signOut();
      }, 30 * 60 * 1000); // 30 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, true);
    });

    resetTimeout();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimeout, true);
      });
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    };
  }, [isAuthenticated]);

  // Helper to set --vh property for iOS Safari
  const setVHProperty = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  // Handle user sign-in/sign-up events
  useEffect(() => {
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('onAuthStateChange: Event received:', event);
      if (event === 'SIGNED_IN' && session?.user) {
        handleUserSignIn(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        handleUserSignOut();
      } else if (event === 'INITIAL_SESSION' && session?.user) {
        handleUserSignIn(session.user.id);
      } else if (event === 'INITIAL_SESSION' && !session?.user) {
        setLoading(false);
      }
    });

    // Initial session check
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session?.user) {
        handleUserSignIn(session.user.id);
      } else {
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      authListener.unsubscribe();
    };
  }, []);

  const handleUserSignIn = async (userId: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Get user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      let profile = profileData;

      if (!profile) {
        // Create new profile for new user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw userError;
        }

        const newProfileData = {
          name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'User',
          email: user?.email || '',
          beta_user: false,
          role: 'free_user'
        };
        
        const { data: upsertedProfile, error: upsertError } = await supabase
          .from('profiles')
          .upsert({ user_id: userId, ...newProfileData }, { onConflict: 'user_id' })
          .select()
          .single();
        
        if (upsertError) {
          throw upsertError;
        }

        profile = upsertedProfile;

        // Track new user signup
        analytics.trackEvent('user_signed_up', { user_id: userId });
        
        // New users go to TDEE wizard
        setUserProfile(profile);
        setIsAuthenticated(true);
        navigate('/tdee');
        setLoading(false);
        return;
      } else {
        setUserProfile(profile);
        setIsAuthenticated(true);
        setLoading(false);
        
        // Track daily active user
        analytics.trackEvent('daily_active_user', { user_id: userId });
        
        // Use role-aware redirect
        await postLoginRedirect();
      }
      
      // Set user properties for analytics
      analytics.identifyUser(userId);
      analytics.setUserProperties({
        beta_user: profile?.beta_user,
        role: profile?.role,
        has_completed_tdee: !!metrics?.tdee
      });
      
    } catch (error) {
      console.error('handleUserSignIn: Error:', error);
      setError(`Login failed: ${error instanceof Error ? error.message : String(error)}. Please try again.`);
      setIsAuthenticated(false);
      navigate('/login');
      setLoading(false);
    }
  };

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
                if (session?.user) {
                  handleUserSignIn(session.user.id);
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

          {/* Default redirect */}
          <Route
            path="/"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/voice" 
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <VoicePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camera"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <CameraPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tdee"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <TDEEOnboardingWizard onComplete={() => navigate('/dashboard')} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interval-timer"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <IntervalTimerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer-dashboard"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <TrainerDashboardPage userProfile={userProfile} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/debug"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <DebugPage userProfile={userProfile} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute loading={loading} isAuthenticated={isAuthenticated}>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route
            path="*"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </div>
    </TimerProvider>
  );
}
        </Routes>
      </div>
    </TimerProvider>
  )
  );
}