import React from 'react';
import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { hasPrivilege, type AppRole, type Privilege } from '../config/rbac';

export function useRole() {
  const { session } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  
  const can = (privilege: Privilege): boolean => {
    return hasPrivilege(role, privilege);
  };

  useEffect(() => {
    const getRole = async () => {
      try {
        setLoading(true);
        const supabase = getSupabase();
        
        if (!session?.user) {
          setRole(null);
          setLoading(false);
          return;
        }

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (error) {
            console.error('[useRole] profiles fetch error:', error.message);
            
            // Handle infinite recursion in RLS policies
            if (error.message?.includes('infinite recursion detected')) {
              console.warn('[useRole] RLS policy infinite recursion detected, using fallback role');
              // Use auth metadata or default to 'user' role
              const fallbackRole = session.user?.app_metadata?.role || 'user';
              setRole(fallbackRole as AppRole);
            } else {
              setRole('free_user' as AppRole); // fallback role
            }
            setLoading(false);
            return;
          }

          const userRole = (data?.role as AppRole) || 'free_user';
          console.log('[useRole] Role fetched for user:', session.user.id, 'Role:', userRole);
          setRole(userRole);
        } catch (profileError: any) {
          console.error('[useRole] profiles fetch error:', profileError.message);
          
          // Handle infinite recursion in RLS policies
          if (profileError.message?.includes('infinite recursion detected')) {
            console.warn('[useRole] RLS policy infinite recursion detected, using fallback role');
            const fallbackRole = session.user?.app_metadata?.role || 'user';
            setRole(fallbackRole as AppRole);
          } else {
            setRole(null);
          }
        }
      } catch (authError) {
        console.error('[useRole] auth error:', authError);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      getRole();
    } else {
      setRole(null);
      setLoading(false);
    }
  }, [session?.user?.id]); // ✅ Re-fetches role when session changes

  return { role, loading, can };
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();
  if (loading) return null; // keep UI quiet during initial fetch
  if (role !== 'admin') return <div>Not authorized</div>;
  return <>{children}</>;
}