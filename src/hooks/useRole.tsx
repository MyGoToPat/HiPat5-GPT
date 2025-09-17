import { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';
import { hasPrivilege, type AppRole, type Privilege } from '../config/rbac';

export function useRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const can = (privilege: Privilege): boolean => {
    return hasPrivilege(role, privilege);
  };

  useEffect(() => {
    const fetchRole = async () => {
      const supabase = getSupabase();

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[useRole] profiles fetch error:', error.message);
          setRole(null);
        } else {
          setRole(data?.role ?? null);
        }
      } catch (err) {
        console.error('[useRole] unexpected error:', err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  return { role, loading, can };
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { role, loading } = useRole();
  if (loading) return null;
  if (role !== 'admin') return <div>Not authorized</div>;
  return <>{children}</>;
}