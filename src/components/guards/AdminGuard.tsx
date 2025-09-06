import React from 'react';
import { getSupabase } from '../../lib/supabase';

type Props = { children: React.ReactNode };

const IS_DEV = (import.meta?.env?.MODE !== 'production');

function collectRoles(user: any): string[] {
  const out: string[] = [];
  const add = (v: any) => {
    if (!v) return;
    if (Array.isArray(v)) out.push(...v.map(String));
    else out.push(String(v));
  };
  add(user?.app_metadata?.roles);
  add(user?.user_metadata?.roles);
  add(user?.app_metadata?.role);
  add(user?.user_metadata?.role);
  return out.map(r => r.toLowerCase());
}

export default function AdminGuard({ children }: Props) {
  const [ok, setOk] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        // DEV-only local override for quick testing
        if (IS_DEV && (localStorage.getItem('hipat_role') || '').toLowerCase() === 'admin') {
          setOk(true);
          return;
        }

        const sb = getSupabase();
        const { data: { user } } = await sb.auth.getUser(); // Supabase session
        const roles = collectRoles(user);
        const email = (user?.email || '').toLowerCase();

        // Optional env allowlist (comma-separated) e.g. VITE_ADMIN_EMAILS="info@hipat.app,admin@company.com"
        const envAllow = String(import.meta?.env?.VITE_ADMIN_EMAILS || '')
          .toLowerCase()
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);

        const isAdmin = roles.includes('admin') || envAllow.includes(email);
        setOk(!!isAdmin);
      } catch {
        setOk(false);
      }
    })();
  }, []);

  if (ok === null) return null; // keep it blank while checking
  if (!ok) {
    return (
      <div style={{ padding: 24, color: '#111', textAlign: 'center' }}>
        <h1 className="text-xl font-semibold">404 - Not Found</h1>
        <p className="text-sm opacity-80">You do not have permission to view this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}