import React from 'react';
import { ExternalLink, Settings, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';

const SWARM_TABS = [
  { id: 'tell-me-what-you-ate',       label: 'Tell Me What You Ate' },
  { id: 'make-me-better',             label: 'Make Me Better' },
  { id: 'tell-me-about-your-workout', label: 'Tell Me About Your Workout' },
] as const;

type AgentRow = {
  id?: string | number;
  slug: string;
  name: string;
  enabled: boolean;
  order: number;
  _dirty?: boolean;
};

const sb = getSupabase();

export default function AgentsListPage() {
  const [rows, setRows] = React.useState<AgentRow[] | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await sb
        .from('agents')
        .select('id, slug, name, enabled, order')
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
    try {
      await sb
        .from('agents')
        .update({
          enabled: !!row.enabled,
        })
        .match(match);

      setRows(curr =>
        (curr ?? []).map(r =>
          (r.id === row.id || r.slug === row.slug) ? { ...r, _dirty: false } : r
        )
      );
      toast.success(`Saved "${row.name}"`);
    } catch (e: any) {
      toast.error(`Save failed${e?.message ? `: ${e.message}` : ''}`);
    }
  }

  if (!rows) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading agents...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Personality Agents</h1>
              <p className="text-gray-600 mt-1">Configure AI personality modules for Pat</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-white text-xs">i</span>
              </div>
              <div>
                <p className="text-blue-900 font-medium">How to use</p>
                <p className="text-blue-800 text-sm mt-1">
                  Toggle <strong>enabled</strong> status, adjust <strong>order</strong> for execution priority, 
                  then click <strong>Save</strong> on any changed row to persist changes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Agents Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Agent Configuration</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-neutral-900/95 backdrop-blur text-left border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Agent</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Swarm
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Order</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map((row, index) => (
                  <tr 
                    key={row.id ?? row.slug}
                    className={`border-t border-neutral-800 odd:bg-neutral-900/30 even:bg-neutral-900/10 hover:bg-gray-50 transition-colors ${
                      row._dirty ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{row.name}</div>
                        <div className="font-mono text-sm text-gray-500">{row.slug}</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <label className="inline-flex items-center gap-3 cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={!!row.enabled}
                            onChange={e => setRow(row.id ?? row.slug, { enabled: e.target.checked })}
                            className="sr-only"
                          />
                          <div className={`w-11 h-6 rounded-full transition-colors ${
                            row.enabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                              row.enabled ? 'translate-x-5 mt-0.5' : 'translate-x-0.5 mt-0.5'
                            }`} />
                          </div>
                        </div>
                        <span className={`text-sm font-medium ${
                          row.enabled ? 'text-green-700' : 'text-gray-500'
                        }`}>
                          {row.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </td>
                    
                    <td className="px-6 py-4">
                      <select
                        value={row.swarm ?? row?.config?.swarm ?? ''}
                        onChange={(e) => setRow(row.id ?? row.slug, { swarm: e.target.value, _dirty: true })}
                        className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-sm"
                      >
                        <option value="">—</option>
                        {SWARM_TABS.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={row.order ?? 0}
                          onChange={e => setRow(row.id ?? row.slug, { order: Number(e.target.value) })}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          max="999"
                        />
                        <span className="text-sm text-gray-500">
                          #{index + 1}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/agents/${row.id}`}
                          className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                          aria-label={`Test ${row.name}`}
                        >
                          Test
                        </Link>
                        <Link
                          to={`/admin/agents/${row.id}`}
                          className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white"
                          aria-label={`Edit ${row.name}`}
                        >
                          Edit
                        </Link>
                        <button
                          disabled={!row._dirty}
                          onClick={() => saveRow(row)}
                          className={`px-3 py-1 rounded ${
                            row._dirty ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-neutral-800 text-neutral-400'
                          }`}
                          aria-label={`Save ${row.name}`}
                        >
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer Stats */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {rows.length} total agents • {rows.filter(r => r.enabled).length} enabled • {rows.filter(r => r._dirty).length} unsaved changes
              </span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-xs">Unsaved changes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Configuration Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Enabled Status</h4>
              <p className="text-gray-600 text-sm">
                Control whether this personality module is active. Disabled agents will not process user interactions.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Execution Order</h4>
              <p className="text-gray-600 text-sm">
                Lower numbers execute first. Use this to prioritize certain personality traits or processing steps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}