import React, { useEffect, useState } from 'react';

type Props = { children: React.ReactNode };

async function uiIsAdmin(): Promise<boolean> {
  try {
    // Optional app hook override
    // @ts-ignore
    if (typeof window !== 'undefined' && typeof window.hipatIsAdmin === 'function') {
      // @ts-ignore
      const ok = await window.hipatIsAdmin();
      if (ok) return true;
    }
    // Simple local checks (no DB writes)
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
  const isBolt = typeof window !== 'undefined' && location.host.includes('bolt.new');

  useEffect(() => {
    (async () => {
      setOk(await uiIsAdmin());
      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  if (!ok) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            maxWidth: 560,
            margin: '40px auto',
            padding: 24,
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            background: '#fff',
            color: '#111',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>404 — Not Found</h1>
          <p style={{ marginBottom: 12 }}>You don't have permission to view this page.</p>
          {isBolt && (
            <>
              <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>
                Dev preview tip: grant temporary admin to preview this page in Bolt.
              </p>
              <button
                onClick={() => {
                  localStorage.setItem('hipat_role', 'admin');
                  location.reload();
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #111',
                  background: '#111',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Grant temporary admin (dev only)
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;