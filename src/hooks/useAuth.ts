import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      const isAdmin = user?.app_metadata?.role === 'admin';
      setAuthState({ user, isAdmin, loading: false });
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      const isAdmin = user?.app_metadata?.role === 'admin';
      setAuthState({ user, isAdmin, loading: false });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return authState;
};