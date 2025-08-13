import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Profile = {
  user_id: string;
  email: string | null;
  name: string | null;
  role: 'admin' | 'trainer' | 'user' | null;
  beta_user: boolean | null;
  created_at: string | null;
};

export default function AdminUsersTable() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('No active session'); setLoading(false); return; }

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, email, name, role, beta_user, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setError(`${error.code || ''} ${error.message}`);
      setRows([]);
    } else {
      setRows((data as Profile[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div>Loading…</div>;
  if (error)   return (
    <div style={{ color: 'crimson' }}>
      Error loading profiles: {error}
    </div>
  );

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <button onClick={load} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer' }}>
          Refresh
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>User ID</th>
              <th style={th}>Email</th>
              <th style={th}>Name</th>
              <th style={th}>Role</th>
              <th style={th}>Beta</th>
              <th style={th}>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.user_id}>
                <td style={tdMono}>{r.user_id}</td>
                <td style={td}>{r.email ?? ''}</td>
                <td style={td}>{r.name ?? ''}</td>
                <td style={td}><RoleBadge role={r.role} /></td>
                <td style={td}>{r.beta_user ? 'Yes' : 'No'}</td>
                <td style={td}>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: Profile['role'] }) {
  const label = role ?? 'unknown';
  const bg =
    role === 'admin'   ? '#e6f4ea' :
    role === 'trainer' ? '#e6eefc' :
    role === 'user'    ? '#f4f4f4' : '#fff2e8';
  const color =
    role === 'admin'   ? '#137333' :
    role === 'trainer' ? '#1a73e8' :
    role === 'user'    ? '#5f6368' : '#c5221f';
  return (
    <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 999, fontSize: 12 }}>
      {label}
    </span>
  );
}

const th: React.CSSProperties = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 6px', fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { borderBottom: '1px solid #f0f0f0', padding: '8px 6px', fontSize: 13 };
const tdMono: React.CSSProperties = { ...td, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' };