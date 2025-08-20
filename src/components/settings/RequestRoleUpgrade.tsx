import React, { useState } from 'react';
import { getSupabase, requestRoleUpgrade, type AppRole } from '../../lib/supabase';

export default function RequestRoleUpgrade() {
  const [role, setRole] = useState<AppRole>('trainer');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await requestRoleUpgrade(role, reason || null);
      setMsg('Request submitted.');
      setReason('');
    } catch (e: any) {
      const m = e?.message ?? String(e);
      if (m.toLowerCase().includes('relation') && m.toLowerCase().includes('upgrade_requests')) {
        setErr('Upgrade requests are not enabled yet.');
      } else {
        setErr(m);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <h3 style={{ marginBottom: 8, fontSize: 16 }}>Request role upgrade</h3>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <label>
          Role
          <select value={role} onChange={e => setRole(e.target.value as AppRole)} disabled={busy} style={{ display: 'block', marginTop: 4 }}>
            <option value="trainer">Trainer</option>
            <option value="pro_user">Pro User</option>
          </select>
        </label>
        <label>
          Reason
          <textarea value={reason} onChange={e => setReason(e.target.value)} disabled={busy} rows={3} style={{ display: 'block', marginTop: 4, width: '100%' }} />
        </label>
        <button type="submit" disabled={busy} style={{ padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
        {msg && <div style={{ color: '#15803d' }}>{msg}</div>}
        {err && <div style={{ color: '#b91c1c' }}>{err}</div>}
      </form>
    </div>
  );
}