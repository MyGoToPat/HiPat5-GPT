import React, { useEffect, useState } from 'react';
import ActiveLink from './ActiveLink';
import { supabase } from '../../lib/supabase';

type Role = 'admin' | 'trainer' | 'user' | null;

export default function TopNav() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (alive) setRole((data?.role as Role) ?? null);
      }
    })();
    return () => { alive = false; };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Let App's auth listener handle redirect; no direct navigate here.
  };

  const isAdmin = role === 'admin';
  const isTrainer = role === 'trainer';
  const isUser = role === 'user';

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
          <ActiveLink to="/trainer-dashboard" hidden={!(isAdmin || isTrainer)}>Trainer</ActiveLink>
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