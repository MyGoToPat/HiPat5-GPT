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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) { setRole(null); setLoading(false); } return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (alive) {
        if (error) {
          // If profiles table is missing or RLS blocks, surface a clear signal
          console.error('[useRole] profiles fetch error:', error);
          setRole(null);
        } else {
          setRole((data?.role as Role) ?? null);
        }
        setLoading(false);
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