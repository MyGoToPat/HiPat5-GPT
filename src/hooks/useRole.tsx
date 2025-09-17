// src/hooks/useRole.tsx

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { getSupabase } from '../lib/supabase';
import { hasPrivilege, AppRole, Privilege } from '../config/rbac';

export function useRole() {
  const { session } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const can = (privilege: Privilege): boolean => {
    return hasPrivilege(role, privilege);
  };

  useEffect(() => {
    const fetchRole = async () => {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session?.user.id) // ✅ FIXED
          .maybeSingle();

        if (error) {
          console.warn('[useRole] profile fetch error:', error.message);
        }

        setRole(data?.role ?? null);
      } catch (err) {
        console.error('[useRole] fetchRole error:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchRole();
    }
  }, [session?.user?.id]);

  return { role, loading, can };
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();
  if (loading) return null;
  if (role !== 'admin') return <div>Not authorized</div>;
  return <>{children}</>;
}