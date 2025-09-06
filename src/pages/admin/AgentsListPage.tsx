import React from 'react';
import { ExternalLink } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';

type AgentRow = {
  id?: string | number;
  slug: string;
  name: string;
  enabled: boolean;
  order: number;
  v1?: number | null;
  _dirty?: boolean;
};

const sb = getSupabase();

export default function AgentsListPage() {
  const [rows, setRows] = React.useState<AgentRow[] | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await sb
        .from('agents')
        .select('id, slug, name, enabled, order, v1')
        .order('order', { ascending: true });
      setRows((data as AgentRow[]) ?? []);
    })();
  }, []);

  function setRow(key: string | number, patch: Partial<AgentRow>) {
    setRows(curr =>
      (curr ?? []).map(r =>
        (r.id === key || r.slug === key) ? { ...r, ...patch, _dirty: true } : r
      )
    );
  }

  async function saveRow(row: AgentRow) {
    const match = row.id != null ? { id: row.id } : { slug: row.slug };
    await sb
      .from('agents')
      .update({
        enabled: !!row.enabled,
        order: Number.isFinite(Number(row.order)) ? Number(row.order) : 0,
      })
      .match(match);

    setRows(curr =>
      (curr ?? []).map(r =>
        (r.id === row.id || r.slug === row.slug) ? { ...r, _dirty: false } : r
      )
    );
  }

  if (!rows) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Personality Agents</h1>

      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900 text-left">
            <tr>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Enabled</th>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">v1</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id ?? row.slug} className="border-t border-neutral-800">
                <td className="px-3 py-2 font-mono">{row.slug}</td>
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!row.enabled}
                    onChange={e => setRow(row.id ?? row.slug, { enabled: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.order ?? 0}
                    onChange={e => setRow(row.id ?? row.slug, { order: Number(e.target.value) })}
                    className="w-20 bg-neutral-900 border border-neutral-700 rounded px-2 py-1"
                  />
                </td>
                <td className="px-3 py-2">{row.v1 ?? '-'}</td>
                <td className="px-3 py-2">
                  <button
                    disabled={!row._dirty}
                    onClick={() => saveRow(row)}
                    className={`px-3 py-1 rounded ${
                      row._dirty ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-neutral-400">
        Toggle enabled, adjust order, then click <b>Save</b> on any changed row.
      </div>
    </div>
  );
}