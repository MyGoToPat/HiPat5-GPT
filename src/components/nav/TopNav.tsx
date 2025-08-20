import React, { useEffect, useState } from 'react';
import ActiveLink from './ActiveLink';
import { getSupabase } from '../../lib/supabase';

type Role = 'admin' | 'trainer' | 'user' | null;

export default function TopNav() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        setEmail(user?.email ?? null);
        if (user) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', user.id)
              .maybeSingle();
            if (alive) setRole((data?.role as Role) ?? 'user');
          } catch (profileError: any) {
            console.error('[TopNav] Profile fetch error:', profileError);
            if (alive) setRole(null);
          }
        }
      } catch (error) {
        console.error('[TopNav] Auth error:', error);
      }
    })();
    return () => { alive = false; };
  }, []);

  const signOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  const isAdmin = role === 'admin';
  const isTrainer = role === 'trainer' || role === 'admin';

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>HiPat</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Admin can see all primary routes */}
          <ActiveLink to="/dashboard" hidden={false}>Dashboard</ActiveLink>
          <ActiveLink to="/trainer-dashboard" hidden={!isTrainer}>Trainer</ActiveLink>
          <ActiveLink to="/tdee" hidden={false}>TDEE</ActiveLink>
          <ActiveLink to="/profile" hidden={false}>Profile</ActiveLink>
          <ActiveLink to="/admin" hidden={!isAdmin}>Admin</ActiveLink>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {email && <span style={{ fontSize: 12, opacity: 0.7 }}>{email} ({role ?? '—'})</span>}
        <button onClick={signOut} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          Sign out
        </button>
      </div>
    </div>
  );
}