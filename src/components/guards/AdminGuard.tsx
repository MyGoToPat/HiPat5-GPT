import React, { useEffect, useState } from 'react';

type Props = { children: React.ReactNode };

async function uiIsAdmin(): Promise<boolean> {
  try {
    // Optional app hook first
    // @ts-ignore
    if (typeof window !== 'undefined' && typeof window.hipatIsAdmin === 'function') {
      // @ts-ignore
      const ok = await window.hipatIsAdmin();
      if (ok) return true;
    }
    // Local role/email fallback (no DB touches)
    const role = (localStorage.getItem('hipat_role') || '').toLowerCase();
    if (role === 'admin') return true;
    const email = (localStorage.getItem('hipat_email') || '').toLowerCase();
    if (email === 'info@hipat.app') return true;
  } catch {}
  return false;
}

const AdminGuard: React.FC<Props> = ({ children }) => {
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { setOk(await uiIsAdmin()); setLoading(false); })(); }, []);
  if (loading) return null;
  if (!ok) {
    return (
      <div style={{ padding: 24, color: '#fff', textAlign: 'center' }}>
        <h1>404 - Not Found</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
};

export default AdminGuard;