import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Item = {
  id: number;
  actor_id: string;
  target_user_id: string;
  from_role: string | null;
  to_role: string;
  reason: string | null;
  created_at: string;
};

export default function RoleChangeHistory({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Item[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const { data, error } = await supabase
        .from('role_change_history')
        .select('id, actor_id, target_user_id, from_role, to_role, reason, created_at')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false });
      if (error) setErr(error.message);
      setRows(data || []);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <div>Loading audit…</div>;
  if (err) return <div style={{color:'#b00'}}>Audit error: {err}</div>;
  if (!rows.length) return <div>No role changes recorded.</div>;

  return (
    <div style={{marginTop:16}}>
      <h4 style={{margin:'0 0 8px'}}>Role change history</h4>
      <ul style={{fontSize:14, lineHeight:1.4}}>
        {rows.map(r => (
          <li key={r.id}>
            <strong>{r.to_role}</strong> from <em>{r.from_role ?? 'unknown'}</em> — {new Date(r.created_at).toLocaleString()}
            {r.reason ? <> · Reason: {r.reason}</> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}