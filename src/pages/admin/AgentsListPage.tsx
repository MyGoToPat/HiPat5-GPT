import React from "react";
import { supabase } from "../../lib/supabase";

type AgentRow = {
  id: string;
  slug: string;
  name: string | null;
  category: string | null;
  order: number | null;
  enabled: boolean | null;
  v1?: number | null;
};

export default function AgentsListPage() {
  const [rows, setRows] = React.useState<AgentRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("agents")
          .select("id, slug, name, category, order, enabled, agent_versions!agent_versions_agent_id_fkey(version)")
          .eq("category", "personality")
          .order("order", { ascending: true });

        if (error) throw error;

        const mapped: AgentRow[] = (data || []).map((r: any) => ({
          id: r.id,
          slug: r.slug,
          name: r.name,
          category: r.category,
          order: r.order,
          enabled: r.enabled,
          v1: Array.isArray(r.agent_versions) ? (r.agent_versions[0]?.version ?? null) : null,
        }));

        setRows(mapped);
        setLoading(false);
      } catch (e: any) {
        setError(e?.message || "Failed to load agents");
        setLoading(false);
      }
    })();
  }, []);

  const setRow = (id: string, patch: Partial<AgentRow>) => {
    setRows(r => r.map(row => (row.id === id ? { ...row, ...patch } : row)));
  };

  const saveRow = async (row: AgentRow) => {
    setSaving(row.id);
    try {
      const { error } = await supabase
        .from("agents")
        .update({ enabled: row.enabled, order: row.order })
        .eq("id", row.id);
      if (error) throw error;
    } catch (e: any) {
      alert(`Save failed: ${e?.message || e}`);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-4">Loading agents…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Personality Agents</h1>
      <div className="text-sm text-gray-500 mb-2">
        Toggle <code>enabled</code>, adjust <code>order</code>, and click Save per row.
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 w-[120px]">Enabled</th>
              <th className="px-3 py-2 w-[120px]">Order</th>
              <th className="px-3 py-2 w-[120px]">v1</th>
              <th className="px-3 py-2 w-[120px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.slug}</td>
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={!!row.enabled}
                      onChange={(e) => setRow(row.id, { enabled: e.target.checked })}
                    />
                    <span>{row.enabled ? "On" : "Off"}</span>
                  </label>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    className="w-24 border rounded px-2 py-1"
                    value={row.order ?? 0}
                    onChange={(e) => setRow(row.id, { order: Number(e.target.value) })}
                  />
                </td>
                <td className="px-3 py-2">{row.v1 ?? "-"}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => saveRow(row)}
                    disabled={saving === row.id}
                    className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
                    aria-label={`Save ${row.slug}`}
                  >
                    {saving === row.id ? "Saving…" : "Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Keep ShopLens tile/link behavior elsewhere; ensure href targets /admin/agents/shoplens */}
    </div>
  );
}