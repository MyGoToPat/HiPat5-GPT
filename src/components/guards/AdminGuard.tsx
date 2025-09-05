import React, { useEffect, useState } from 'react';

type Props = { children: React.ReactNode };

// Treat 'admin' as the privileged role (case-insensitive). No hard-coded emails.
const ADMIN_ROLE = 'admin';
const IS_DEV = (import.meta?.env?.MODE !== 'production');

// Try to get a Supabase client from window or the common local client file.
async function getSupabase(): Promise<any | null> {
  const w = window as any;
  if (w?.supabase) return w.supabase;
  try {
    // components/guards -> lib = ../../lib
    const mod: any = await import(/* @vite-ignore */ '../../lib/supabaseClient');
    return mod?.supabase ?? mod?.default ?? null;
  } catch {
    return null;
  }
}

function isAdminFromUser(user: any): boolean {
  if (!user) return false;
  const roles = new Set<string>();

  // Common places apps store roles in Supabase user object:
  // app_metadata.roles (array), user_metadata.roles (array),
  // app_metadata.role (string), user_metadata.role (string)
  const add = (v: any) => {
    if (!v) return;
    if (Array.isArray(v)) v.forEach(add);
    else roles.add(String(v).toLowerCase());
  };

  add(user?.app_metadata?.roles);
  add(user?.user_metadata?.roles);
  add(user?.app_metadata?.role);
  add(user?.user_metadata?.role);

  return roles.has(ADMIN_ROLE);
}

const AdminGuard: React.FC<Props> = ({ children }) => {
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const sb = await getSupabase();

      let user: any = null;
      try {
        if (sb?.auth?.getUser) {
          const { data } = await sb.auth.getUser(); // <-- proof line #2
          user = data?.user ?? null;
        } else if (sb?.auth?.getSession) {
          const { data } = await sb.auth.getSession();
          user = data?.session?.user ?? null;
        }
      } catch {
        // ignore and fall through to dev-only fallback
      }

      if (isAdminFromUser(user)) {
        setOk(true);
      } else {
        // Dev-only fallback: allow local override without touching Supabase/DB
        const role = (localStorage.getItem('hipat_role') || '').toLowerCase();
        setOk(IS_DEV && role === ADMIN_ROLE);
      }

      setLoading(false);
    })();
  }, []);

  if (loading) return null;

  if (!ok) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#111' }}>
        <div style={{
          display: 'inline-block',
          padding: 16,
          borderRadius: 8,
          background: '#fff',
          border: '1px solid #e5e7eb',
          minWidth: 280
        }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>404 — Not Found</h1>
          <p style={{ marginTop: 8, opacity: 0.8 }}>You don't have permission to view this page.</p>

          {IS_DEV && (
            <button
              onClick={() => { localStorage.setItem('hipat_role', 'admin'); location.reload(); }}
              style={{
                marginTop: 16,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #111',
                background: '#111',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Grant temporary admin (dev only)
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;