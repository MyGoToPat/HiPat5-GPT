import React, { useEffect, useState } from 'react';
import { approveUpgradeRequest, denyUpgradeRequest } from '../../lib/supabase';

type Req = {
  id: string;
  user_id: string;
  requested_role?: 'admin' | 'trainer' | 'user';
  reason?: string | null;
  status?: string | null;
  created_at?: string;
};

type Profile = { user_id: string; email?: string | null; name?: string | null };

export default function UpgradeRequests() {
  const [rows, setRows] = useState<Array<Req & { email?: string | null; name?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      // list requests if table exists
      const { data: reqs, error: rErr } = await supabase
        .from('upgrade_requests')
        .select('*');

      if (rErr) throw rErr;

      // join profiles client-side (avoid FK assumptions)
      const ids = Array.from(new Set((reqs ?? []).map(r => r.user_id)));
      let emailsById: Record<string, Profile> = {};

      if (ids.length) {
        // attempt with email, name, fallback to user_id only if columns missing
        try {
          const { data: profs } = await supabase
            .from('profiles')
            .select('user_id, email, name')
            .in('user_id', ids);
          for (const p of profs ?? []) emailsById[p.user_id] = p as Profile;
        } catch (err: any) {
          const msg = err?.message?.toLowerCase?.() ?? '';
          if (msg.includes('column') && (msg.includes('email') || msg.includes('name'))) {
            const { data: profs2 } = await supabase
              .from('profiles')
              .select('user_id')
              .in('user_id', ids);
            for (const p of profs2 ?? []) emailsById[(p as any).user_id] = { user_id: (p as any).user_id };
          } else if (msg.includes('relation') && msg.includes('profiles')) {
            // profiles table missing, proceed without enrichment
          } else {
            throw err;
          }
        }
      }

      const merged = (reqs ?? []).map(r => ({
        ...r,
        email: emailsById[r.user_id]?.email ?? null,
        name: emailsById[r.user_id]?.name ?? null,
      }));

      setRows(merged);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('upgrade_requests')) {
        setError('upgrade_requests table not found (migration not yet applied).');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div>Loading upgrade requests…</div>;
  if (error) return <div className="text-yellow-700">Upgrade Requests: {error}</div>;
  if (!rows.length) return <div>No upgrade requests.</div>;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h2 style={{ fontSize: 16 }}>Upgrade Requests</h2>
        <button onClick={load} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6 }}>Refresh</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>User</Th>
              <Th>Requested</Th>
              <Th>Status</Th>
              <Th>Reason</Th>
              <Th>Created</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <RequestRow key={r.id} row={r} onDone={load} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestRow({ row, onDone }: { row: any; onDone: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const act = async (kind: 'approve' | 'deny') => {
    setBusy(true);
    setErr(null);
    try {
      if (kind === 'approve') {
        const role = (row.requested_role ?? 'user') as 'admin' | 'trainer' | 'user';
        await approveUpgradeRequest(row.id, row.user_id, role);
      } else {
        await denyUpgradeRequest(row.id);
      }
      await onDone();
    } catch (e: any) {
      const m = e?.message ?? String(e);
      const ml = m.toLowerCase();
      if (ml.includes('relation') && ml.includes('upgrade_requests')) {
        setErr('upgrade_requests table not found.');
      } else if (ml.includes('policy')) {
        setErr('Not authorized by RLS to perform this action.');
      } else {
        setErr(m);
      }
    } finally {
      setBusy(false);
    }
  };

  const pending = (row.status ?? 'pending') === 'pending';

  return (
    <tr>
      <Td mono>{row.id}</Td>
      <Td>
        <div>{row.name || row.email || row.user_id}</div>
        {row.email && <div style={{ opacity: 0.7, fontSize: 12 }}>{row.email}</div>}
      </Td>
      <Td>{row.requested_role ?? '—'}</Td>
      <Td>{row.status ?? 'pending'}</Td>
      <Td style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>{row.reason ?? '—'}</Td>
      <Td>{row.created_at ? new Date(r.created_at).toLocaleString() : '—'}</Td>
      <Td>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => act('approve')} disabled={busy || !pending} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6 }}>Approve</button>
          <button onClick={() => act('deny')} disabled={busy || !pending} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6 }}>Deny</button>
        </div>
        {err && <div style={{ color: '#b91c1c', marginTop: 6 }}>{err}</div>}
      </Td>
    </tr>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb', fontSize: 12, opacity: 0.7 }}>{children}</th>;
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9', fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined }}>{children}</td>;
}