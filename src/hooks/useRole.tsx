import React from 'react';
import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { hasPatAccess, type AclProfile } from '../lib/access/acl';
import { hasPrivilege, type AppRole, type Privilege } from '../config/rbac';

export function useRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  
  const can = (privilege: Privilege): boolean => {
    return hasPrivilege(role, privilege);
  };

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
            .from('profiles') // Fetch all relevant fields for AclProfile
            .select('role, beta_user')
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            console.error('[useRole] profiles fetch error:', error.message);
            setRole('free_user' as AppRole); // fallback role
            setLoading(false);
            return;
          }

          setRole((data?.role as AppRole) || 'free_user'); // Still return AppRole for existing 'can' checks
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

  return { role, loading, can };
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();
  if (loading) return null; // keep UI quiet during initial fetch
  if (role !== 'admin') return <div>Not authorized</div>;
  return <>{children}</>;
}