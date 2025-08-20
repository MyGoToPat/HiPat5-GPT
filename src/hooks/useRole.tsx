import React from 'react';
import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';

export function useRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getRole = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('[useRole] profiles fetch error:', error.message);
            setRole('free_user'); // fallback role
            setLoading(false);
            return;
          }

          setRole(data?.role || 'free_user');
        } catch (profileError: any) {
          console.error('[useRole] profiles fetch error:', profileError.message);
          setRole(null);
        }
      } catch (authError) {
        console.error('[useRole] auth error:', authError);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    getRole();
  }, []);

  return { role, loading };
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();
  if (loading) return null; // keep UI quiet during initial fetch
  if (role !== 'admin') return <div>Not authorized</div>;
  return <>{children}</>;
}