import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../lib/supabase';

type Item = {
  id: number;
  changed_by: string;
  target_user_id: string;
  old_role: string | null;
  new_role: string;
  changed_at: string;
};

export default function RoleChangeHistory({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Item[]>([]);
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('role_change_history')
        .select('id, changed_by, target_user_id, old_role, new_role, changed_at')
        .eq('target_user_id', userId)
        .order('changed_at', { ascending: false });
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
            <strong>{r.new_role}</strong> from <em>{r.old_role ?? 'unknown'}</em> — {new Date(r.changed_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}