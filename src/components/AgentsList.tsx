import React, { useEffect, useState } from 'react';
import { getSupabase } from '../lib/supabase';

type Agent = { id: string; slug: string; category: string; enabled: boolean; order: number };

export default function AgentsList() {
  const supabase = getSupabase();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      const { data, error } = await supabase
        .from('agents')
        .select('id, slug, category, enabled, "order"')
        .eq('category', 'personality')
        .order('order', { ascending: true });
      if (error) setError(error.message);
      setAgents(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div>Loading agents…</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-2">Personality Agents ({agents.length})</h3>
      <table className="text-sm border-collapse">
        <thead><tr><th className="border px-2 py-1">Order</th><th className="border px-2 py-1">Slug</th><th className="border px-2 py-1">Enabled</th></tr></thead>
        <tbody>
          {agents.map(a => (
            <tr key={a.id}>
              <td className="border px-2 py-1">{a.order}</td>
              <td className="border px-2 py-1">{a.slug}</td>
              <td className="border px-2 py-1">{a.enabled ? 'true' : 'false'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}