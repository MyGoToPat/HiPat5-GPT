import React from "react";
import supabase from "../../lib/supabase";

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

  React.useEffect(() => {
    (async () => {
      try {
        // read-only listing; personality only; left join v1 version if present
        const { data, error } = await supabase
          .from("agents")
          .select("id, slug, name, category, order, enabled, agent_versions(version)")
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
          v1: Array.isArray(r.agent_versions) && r.agent_versions.length > 0
            ? r.agent_versions.find((v: any)=>v.version===1)?.version ?? null
            : null,
        }));
        setRows(mapped);
      } catch (e:any) {
        setError(e?.message ?? "Failed to load agents");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-4">Loading agents…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-3">Personality Agents (read-only)</h1>
      <div className="text-sm text-gray-500 mb-2">
        DB-driven; 12 rows expected when seeded. Toggle/order will be wired later.
      </div>
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Enabled</th>
              <th className="px-3 py-2 text-left">v1</th>
              <th className="px-3 py-2 text-left">ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{i+1}</td>
                <td className="px-3 py-2 font-mono">{r.slug}</td>
                <td className="px-3 py-2">{r.name ?? "—"}</td>
                <td className="px-3 py-2">{r.order ?? "—"}</td>
                <td className="px-3 py-2">{String(r.enabled)}</td>
                <td className="px-3 py-2">{r.v1 ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-3 py-4" colSpan={7}>No agents found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}