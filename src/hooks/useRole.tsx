import React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Role = 'admin' | 'trainer' | 'user' | null;

export function useRole() {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (alive) { setRole(null); setLoading(false); } return; }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (alive) {
          if (error) {
            // Handle RLS recursion and other profile fetch errors
            if (error.code === '42P17' || error.message?.includes('infinite recursion')) {
              console.warn('[useRole] RLS recursion detected, using fallback role');
              setRole('user'); // Safe fallback role
            } else {
              console.error('[useRole] profiles fetch error:', error);
              setRole(null);
            }
          } else {
            setRole((data?.role as Role) ?? null);
          }
          setLoading(false);
        }
      } catch (fetchError: any) {
        if (alive) {
          console.warn('[useRole] Network or fetch error, using fallback role:', fetchError?.message || fetchError);
          setRole('user'); // Safe fallback for network issues
          setLoading(false);
        }
      }
    })();

    return () => { alive = false; };
  }, []);

  return { role, loading };
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();
  if (loading) return null; // keep UI quiet during initial fetch
  if (role !== 'admin') return <div>Not authorized</div>;
  return <>{children}</>;
}