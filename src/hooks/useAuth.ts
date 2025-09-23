import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    // Prime with current session to avoid redirect "flicker"
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch((error) => {
        // Handle case where JWT contains invalid user reference
        if (error.message && error.message.includes('User from sub claim in JWT does not exist')) {
          // Clear the invalid session data
          supabase.auth.signOut();
          setSession(null);
        }
        setLoading(false);
      });

    // Subscribe to changes
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });

    return () => {
      sub.subscription?.unsubscribe();
    };
  }, []);

  return { session, loading };
}