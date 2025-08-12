import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile } from './types/user';
import { analytics } from './lib/analytics';

// Import pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './components/DashboardPage';
import { ProfilePage } from './components/ProfilePage';
import { ChatPat } from './components/ChatPat';
import { TalkingPatPage1 } from './components/TalkingPatPage1';
import { TalkingPatPage2 } from './components/TalkingPatPage2';
import { TalkingPatPage3 } from './components/TalkingPatPage3';
import TDEEOnboardingWizard from './pages/TDEEOnboardingWizard';
import { IntervalTimerPage } from './components/timer/IntervalTimerPage';
import { TrainerDashboardPage } from './components/TrainerDashboardPage';
import { DebugPage } from './pages/DebugPage';

type Page = 'login' | 'register' | 'forgot-password' | 'dashboard' | 'profile' | 'chat' | 'voice' | 'camera' | 'tdee-wizard' | 'interval-timer' | 'trainer-dashboard' | 'debug';

interface NavigationState {
  page: Page;
  state?: { autoStartMode?: 'takePhoto' | 'videoStream' };
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentNavigation, setCurrentNavigation] = useState<NavigationState>({ page: 'login' });
  const [error, setError] = useState<string | null>(null);

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
        setCurrentNavigation({ page: 'tdee-wizard' });
        setLoading(false);
        return;
      } else {
        // Check if user is admin
        if (profile.role === 'admin' || profile.role === 'trainer') {
          setUserProfile(profile);
          setIsAuthenticated(true);
          setCurrentNavigation({ page: profile.role === 'admin' ? 'trainer-dashboard' : 'trainer-dashboard' });
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
          setCurrentNavigation({ page: 'tdee-wizard' });
        } else {
          setCurrentNavigation({ page: 'dashboard' });
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
      setCurrentNavigation({ page: 'login' });
      setLoading(false);
    }
  };

  const handleUserSignOut = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    setCurrentNavigation({ page: 'login' });
    setLoading(false);
    setError(null);
  };

  const navigate = (page: Page, state?: { autoStartMode?: 'takePhoto' | 'videoStream' }) => {
    setCurrentNavigation({ page, state });
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

  let PageComponent;
  switch (currentNavigation.page) {
    case 'login':
      PageComponent = <LoginPage onNavigate={navigate} />;
      break;
    case 'register':
      PageComponent = <RegisterPage onNavigate={navigate} />;
      break;
    case 'forgot-password':
      PageComponent = <ForgotPasswordPage onNavigate={navigate} />;
      break;
    case 'dashboard':
      PageComponent = <DashboardPage onNavigate={navigate} />;
      break;
    case 'profile':
      PageComponent = <ProfilePage onNavigate={navigate} />;
      break;
    case 'chat':
      PageComponent = <ChatPat onNavigate={navigate} />;
      break;
    case 'voice':
      PageComponent = <TalkingPatPage1 onNavigate={navigate} />;
      break;
    case 'camera':
      PageComponent = <TalkingPatPage2 onNavigate={navigate} initialState={currentNavigation.state} />;
      break;
    case 'tdee-wizard':
      PageComponent = <TDEEOnboardingWizard onComplete={() => navigate('dashboard')} />;
      break;
    case 'interval-timer':
      PageComponent = <IntervalTimerPage onBack={() => navigate('dashboard')} />;
      break;
    case 'trainer-dashboard':
      PageComponent = <TrainerDashboardPage onNavigate={navigate} userProfile={userProfile} />;
      break;
    case 'debug':
      PageComponent = <DebugPage onNavigate={navigate} userProfile={userProfile} />;
      break;
    default:
      PageComponent = <LoginPage onNavigate={navigate} />;
  }

  return (
    <div className="App">
      {PageComponent}
    </div>
  );
}

export default App;