import React from 'react';
import AdminHeader from '../../components/admin/AdminHeader';
import { Link } from 'react-router-dom';
import { getSupabase } from '../../lib/supabase'; // mirror the import used in AgentsListPage.tsx
import { SWARM_TABS } from '../../lib/swarm-tabs';

const sb = getSupabase();

type Agent = {
  id: string;
  slug: string;
  name: string;
  enabled: boolean;
  order: number | null;
};

const AgentSandboxPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [role, setRole] = React.useState<string>('');
  const [agentSlug, setAgentSlug] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await sb
        .from('agents')
        .select('id, slug, name, enabled, order');
      if (!error && Array.isArray(data)) setAgents(data as Agent[]);
      setLoading(false);
    })();
  }, []);

  const roleAgents = React.useMemo(() => {
    if (!role) return agents;
    return (agents ?? []);
  }, [agents, role]);

  const selected = React.useMemo(
    () => roleAgents.find(a => a.slug === agentSlug) ?? null,
    [roleAgents, agentSlug]
  );

  return (
    <div className="p-6 space-y-6 text-neutral-200">
      <AdminHeader
        title="Agent & Swarm Sandbox (Read-Only)"
        subtitle="Pick a role and agent to smoke-test routing, view config JSON, and open chat."
        right={
          <Link to="/admin/agents" className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200">
            Agents
          </Link>
        }
      />

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-neutral-400">Role</label>
          <select
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2"
            value={role}
            onChange={(e) => { setRole(e.target.value); setAgentSlug(''); }}
          >
            <option value="">All roles</option>
            {SWARM_TABS.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-neutral-400">Agent</label>
          <select
            className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2"
            value={agentSlug}
            onChange={(e) => setAgentSlug(e.target.value)}
          >
            <option value="">— Select agent —</option>
            {roleAgents.map(a => (
              <option key={a.slug} value={a.slug}>
                {a.name || a.slug}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">
            Showing {roleAgents.length} agent(s){role ? ` in ${role}` : ''}.
          </p>
        </div>

        <div className="space-y-2 flex items-end">
          <div className="flex gap-2">
            <Link
              to={agentSlug ? `/chat?agent=${agentSlug}` : '/chat'}
              className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              aria-label="Test in Chat"
            >
              Test in Chat
            </Link>
            {agentSlug && (
              <Link
                to={`/admin/agents/${agentSlug}`}
                className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700"
                aria-label="Edit Agent"
              >
                Edit Agent
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <label className="text-sm text-neutral-400">Config (read-only JSON)</label>
        <pre className="w-full h-[340px] overflow-auto bg-neutral-950 border border-neutral-800 rounded p-3 text-xs">
{JSON.stringify(selectedConfig, null, 2)}
        </pre>
      </section>

      {!loading && agents.length === 0 && (
        <p className="text-neutral-400 text-sm">No agents found.</p>
      )}
    </div>
  );
};

export default AgentSandboxPage;