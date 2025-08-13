import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile } from './types/user';
import { analytics } from './lib/analytics';
import { TimerProvider } from './context/TimerContext';

// Import pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './components/DashboardPage';
import { ProfilePage } from './components/ProfilePage';
import { ChatPat } from './components/ChatPat';
import { TalkingPatPage1 } from './components/TalkingPatPage1';
import { TalkingPatPage2 } from './components/TalkingPatPage2';
import TDEEOnboardingWizard from './pages/TDEEOnboardingWizard';
import { IntervalTimerPage } from './components/timer/IntervalTimerPage';
import { TrainerDashboardPage } from './components/TrainerDashboardPage';
import AdminPage from './pages/AdminPage';

// Create a DebugPage wrapper since it doesn't exist as a separate page
import { useLocation } from 'react-router-dom';

const DebugPage: React.FC = () => {
  const navigate = useNavigate();
  
  const handleNavigate = (page: string) => {
    switch (page) {
      case 'dashboard': navigate('/dashboard'); break;
      case 'profile': navigate('/profile'); break;
      case 'chat': navigate('/chat'); break;
      case 'voice': navigate('/voice'); break;
      case 'camera': navigate('/camera'); break;
      case 'tdee-wizard': navigate('/tdee'); break;
      case 'interval-timer': navigate('/interval-timer'); break;
      case 'trainer-dashboard': navigate('/trainer-dashboard'); break;
      case 'debug': navigate('/debug'); break;
      case 'admin': navigate('/admin'); break;
      default: navigate('/dashboard');
    }
  };

  // Mock userProfile for debug page
  const mockUserProfile: UserProfile = {
    id: 'debug-user',
    user_id: 'debug-user',
    name: 'Debug User',
    email: 'debug@example.com',
    beta_user: true,
    role: 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Debug Page</h1>
          <p className="text-gray-600 mb-6">This is a debug page for testing purposes.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleNavigate('dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
            <button 
              onClick={() => handleNavigate('admin')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Go to Admin
            </button>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Debug Info</h3>
            <p className="text-sm text-gray-600">Current path: {window.location.pathname}</p>
            <p className="text-sm text-gray-600">Environment: {import.meta.env.MODE}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: programmatic nav to replace any prior string-based onNavigate
export function useNav() {
  const navigate = useNavigate();
  return (path: string) => navigate(path);
}

// Minimal protected route wrapper (auth-only; AdminPage uses its own AdminGuard)
function ProtectedRoute({ isAuthed, children }: { isAuthed: boolean; children: JSX.Element }) {
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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
        // Check if user is admin
        if (profile.role === 'admin' || profile.role === 'trainer') {
          setUserProfile(profile);
          setIsAuthenticated(true);
          navigate('/trainer-dashboard');
          setLoading(false);
          return;
        }
        
        // Check for user metrics (TDEE completion)
        let metrics = null;
        try {
          const { data, error } = await supabase
            .from('user_metrics')
            .select('*')
            .eq('user_id', userId)
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
        
        setUserProfile(profile);
        setIsAuthenticated(true);
        
        // Track daily active user
        analytics.trackEvent('daily_active_user', { user_id: userId });
        
        // Redirect based on TDEE completion
        if (!metrics || !metrics.tdee) {
          navigate('/tdee');
        } else {
          navigate('/dashboard');
        }
        
        setLoading(false);
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

          {/* Default -> dashboard (protected) */}
          <Route
            path="/"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            }
          />

          {/* Protected app routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <DashboardPage onNavigate={createOnNavigateWrapper()} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <ProfilePage onNavigate={createOnNavigateWrapper()} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <ChatPat onNavigate={createOnNavigateWrapper()} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/voice"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <TalkingPatPage1 onNavigate={createOnNavigateWrapper()} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/camera"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <CameraPageWrapper />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tdee"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <TDEEOnboardingWizard onComplete={() => navigate('/dashboard')} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interval-timer"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <IntervalTimerPage onBack={() => navigate('/dashboard')} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer-dashboard"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <TrainerDashboardPage onNavigate={createOnNavigateWrapper()} userProfile={userProfile} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/debug"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <DebugPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute isAuthed={!!isAuthenticated}>
                <AdminPage /> {/* AdminGuard already enforced inside */}
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
        </Routes>
      </div>
    </TimerProvider>
  );
}

// Camera page wrapper to handle location state
function CameraPageWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleNavigate = (page: string, state?: { autoStartMode?: 'takePhoto' | 'videoStream' }) => {
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
      default: navigate('/dashboard');
    }
  };

  return <TalkingPatPage2 onNavigate={handleNavigate} initialState={location.state} />;
}

export default App;