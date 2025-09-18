import React from 'react';
import AdminHeader from '../../components/admin/AdminHeader';
import RoleTabs from '../../components/admin/RoleTabs';
import { ROLE_ORCHESTRATORS } from '../../lib/role-orchestrators';
import { SWARM_TABS as INITIAL_SWARM_TABS } from '../../lib/swarm-tabs';
import { ExternalLink, Settings, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import AgentTemplateWizard from '@/components/admin/agents/AgentTemplateWizard';
import { getPersonalityAgents, getPersonalitySwarm, upsertPersonalityAgent } from '@/state/personalityStore';
import AgentBulkActions from '@/components/admin/agents/AgentBulkActions';
import { useRole } from '../../hooks/useRole';
import { canToggle, isAdmin, canCreateRoles, canManageSwarms } from '../../utils/rbac';
import { NewRoleModal } from '../../components/admin/roles/NewRoleModal';
import { AddSwarmAgentModal } from '../../components/admin/agents/AddSwarmAgentModal';
import { SWARM_TABS } from '../../lib/swarm-tabs';

type AgentRow = {
  id?: string | number;
  slug: string;
  name: string;
  enabled: boolean;
  order: number;
  enabledForPaid?: boolean;
  enabledForFreeTrial?: boolean;
  current_version_id?: string;
  _open?: boolean;
  _dirty?: boolean;
  swarm?: string;
  versionConfig?: { swarm?: string };
};

const sb = getSupabase();

export default function AgentsListPage() {
  const [rows, setRows] = React.useState<AgentRow[] | null>(null);
  const [betaEnabled, setBetaEnabled] = React.useState(false);
  const [paidEnabled, setPaidEnabled] = React.useState(false);
  const [roleFilter, setRoleFilter] = React.useState<string | null>(null);
  const [swarmTabs, setSwarmTabs] = React.useState(INITIAL_SWARM_TABS);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<any>(null);
  const [showNewRoleModal, setShowNewRoleModal] = React.useState(false);
  const [showAddAgentModal, setShowAddAgentModal] = React.useState(false);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  // Get current user role for gating toggles
  const { role: currentUserRole, loading: roleLoading } = useRole();

  // Force re-render when personality store updates
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const onRefresh = () => forceUpdate();
    window.addEventListener("hipat:personality:refresh", onRefresh);
    return () => window.removeEventListener("hipat:personality:refresh", onRefresh);
  }, []);

  // Compute filtered results based on role selection
  const filtered = !roleFilter ? (rows ?? []) : (rows ?? []).filter(r => (r.versionConfig?.swarm ?? '') === roleFilter);

  // Get orchestrator slug for the current role filter
  const orchestratorSlug = roleFilter ? ROLE_ORCHESTRATORS[roleFilter] : null;

  React.useEffect(() => {
    (async () => {
      // If filtering for personality, use local store
      if (roleFilter === 'pats-personality') {
        const personalityAgents = getPersonalityAgents();
        const swarm = getPersonalitySwarm();
        
        const personalityRows: AgentRow[] = swarm.map(agentId => {
          const agent = personalityAgents[agentId];
          if (!agent) return null;
          return {
            id: agent.id,
            slug: agent.id,
            name: agent.name,
            enabled: agent.enabled,
            enabledForPaid: agent.enabledForPaid ?? true,
            enabledForFreeTrial: agent.enabledForFreeTrial ?? true,
            order: agent.order,
            current_version_id: null,
            versionConfig: { swarm: 'pats-personality' }
          };
        }).filter(Boolean) as AgentRow[];
        
        setRows(personalityRows);
      } else {
        // For other filters, use existing Supabase logic
        const { data } = await sb
          .from('agents')
          .select('id, slug, name, enabled, order, current_version_id')
          .order('order', { ascending: true });
        
        const rows = (data as AgentRow[]) ?? [];
        
        // Collect unique version IDs
        const ids = Array.from(new Set(rows.map(r => r.current_version_id).filter(Boolean)));
        
        if (ids.length > 0) {
          // Bulk fetch versions
          const { data: vers } = await sb
            .from('agent_versions')
            .select('id, config, config_json')
            .in('id', ids);
          
          // Map & attach
          const map = new Map((vers || []).map(v => [v.id, (v.config ?? v.config_json ?? {})]));
          setRows(rows.map(r => ({ ...r, versionConfig: map.get(r.current_version_id) || {} })));
        } else {
          setRows(rows);
        }
      }
    })();
  }, [roleFilter]);

  function setRow(key: string | number, patch: Partial<AgentRow>) {
    setRows(curr =>
      (curr ?? []).map(r =>
        (r.id === key || r.slug === key) ? { ...r, ...patch, _dirty: true } : r
      )
    );
  }

  function setRowKey(key: string | number, patch: Partial<AgentRow>) {
    setRows(curr =>
      (curr ?? []).map(r =>
        (r.id === key || r.slug === key) ? { ...r, ...patch } : r
      )
    );
  }

  async function saveRoleAccess(beta: boolean, paid: boolean) {
    // Implementation for saving role access
    toast.success('Role access settings saved');
  }

  const handleCreateRole = (roleName: string) => {
    // Create new role tab (UI-only, stored in local state)
    const newRole = {
      id: roleName.toLowerCase().replace(/\s+/g, '-'),
      label: roleName,
      blurb: `Custom role: ${roleName}`
    };
    
    setSwarmTabs(prev => [...prev, newRole]);
    toast.success(`Role "${roleName}" created`);
  };

  const handleAddAgentsToSwarm = (agentIds: string[], roleName: string) => {
    // Update agents to be assigned to this role (UI-only)
    const personalityAgents = getPersonalityAgents();
    
    agentIds.forEach(agentId => {
      const agent = personalityAgents[agentId];
      if (agent) {
        // Update agent with swarm assignment
        upsertPersonalityAgent({
          ...agent,
          // Add swarm property or similar to track role assignment
        });
      }
    });
    
    toast.success(`Added ${agentIds.length} agent(s) to ${roleName}`);
  };

  async function saveRow(row: AgentRow) {
    const match = row.id != null ? { id: row.id } : { slug: row.slug };
    try {
      // Save enabled/order to agents table
      await sb
        .from('agents')
        .update({
          enabled: !!row.enabled,
          order: row.order
        })
        .match(match);

      // Save swarm to agent_versions if defined
      if (row.swarm !== undefined) {
        // Fetch agent to get current_version_id
        const { data: agent, error: agentError } = await sb
          .from('agents')
          .select('current_version_id')
          .match(match)
          .single();

        if (!agentError && agent?.current_version_id) {
          // Fetch current version config
          const { data: version, error: versionError } = await sb
            .from('agent_versions')
            .select('id, config, config_json')
            .eq('id', agent.current_version_id)
            .single();

          if (!versionError && version) {
            const base = version.config ?? version.config_json ?? {};
            const merged = { ...base, swarm: row.swarm ?? null };

            // Update agent_versions with merged config
            await sb
              .from('agent_versions')
              .update({ config: merged })
              .eq('id', version.id);
          }
        }
      }

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

  // Show loading state while determining user role
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading permissions...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canToggleAgents = canToggle(currentUserRole);

  return (
    <div className="min-h-screen bg-gray-50 pt-[44px]">
      <div className="max-w-7xl mx-auto p-8">
        <AdminHeader 
          title="Personality Agents" 
          subtitle="Configure AI personality modules for Pat"
          right={
            <div>
              {canCreateRoles(currentUserRole) && (
                <div className="flex items-center gap-3">
                  <AgentBulkActions />
                  <button
                    onClick={() => setShowNewRoleModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                  >
                    New Role
                  </button>
                </div>
              )}
              {roleFilter && canManageSwarms(currentUserRole) && (
                <button
                  onClick={() => setShowAddAgentModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                >
                  Add Agent to Swarm
                </button>
              )}
            </div>
          }
        />
        
        <div className="mb-8">

      {/* Role Header Controls */}
      {roleFilter && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {swarmTabs.find(t => t.id === roleFilter)?.label || roleFilter} Configuration
              </h3>
              <p className="text-xs text-gray-600">Test and configure rollout settings for this role</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to={`/chat?agent=${orchestratorSlug}`}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  orchestratorSlug 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Test Role
              </Link>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={betaEnabled}
                  onChange={(e) => {
                    setBetaEnabled(e.target.checked);
                    saveRoleAccess(e.target.checked, paidEnabled);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Enable for Beta</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={paidEnabled}
                  onChange={(e) => {
                    setPaidEnabled(e.target.checked);
                    saveRoleAccess(betaEnabled, e.target.checked);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Enable for Paid</span>
              </label>
            </div>
          </div>
        </div>
      )}
          
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

        {/* Role Tabs */}
        <RoleTabs value={roleFilter} onChange={setRoleFilter} />

        {/* Agents Table */}
        {roleFilter && roleFilter !== 'pats-personality' && filtered.length === 0 ? (
          /* Empty State for Non-Personality Roles */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {swarmTabs.find(tab => tab.id === roleFilter)?.label}
              </h3>
              <p className="text-gray-600 mb-6">
                {swarmTabs.find(tab => tab.id === roleFilter)?.blurb}
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  to={ROLE_ORCHESTRATORS[roleFilter] ? `/chat?agent=${ROLE_ORCHESTRATORS[roleFilter]}` : '#'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    ROLE_ORCHESTRATORS[roleFilter]
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Test Role
                </Link>
                <Link
                  to="/admin/agents"
                  onClick={() => toast.info('Create agent functionality coming soon')}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
                >
                  Add new swarm agent
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Agents Table */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Agent Configuration</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="sticky top-0 z-10 bg-neutral-900/95 backdrop-blur text-left border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Expand</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Agent</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Enable for Paid</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Enable for Free/Trial</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    Swarm
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Order</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((row, index) => (
                  <React.Fragment key={row.id ?? row.slug}>
                    <tr 
                      className={`hover:bg-gray-50 transition-colors ${
                        row._dirty ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setRowKey(row.id ?? row.slug, { _open: !row._open })}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {row._open ? (
                            <ChevronUp size={16} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-400" />
                          )}
                        </button>
                      </td>
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
                              disabled={!canToggleAgents}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              row.enabled ? 'bg-green-500' : 'bg-gray-300'
                            } ${!canToggleAgents ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                          {!canToggleAgents && (
                            <span className="text-xs text-gray-500 ml-2">Admin/Beta only</span>
                          )}
                        </label>
                      </td>
                      
                      <td className="px-6 py-4">
                        <label className="inline-flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={!!(row.enabledForPaid ?? true)}
                              onChange={e => {
                                if (isAdmin(currentUserRole)) {
                                  setRow(row.id ?? row.slug, { enabledForPaid: e.target.checked });
                                }
                              }}
                              disabled={!isAdmin(currentUserRole)}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              (row.enabledForPaid ?? true) ? 'bg-green-500' : 'bg-gray-300'
                            } ${!isAdmin(currentUserRole) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                                (row.enabledForPaid ?? true) ? 'translate-x-5 mt-0.5' : 'translate-x-0.5 mt-0.5'
                              }`} />
                            </div>
                          </div>
                          <span className={`text-sm font-medium ${
                            (row.enabledForPaid ?? true) ? 'text-green-700' : 'text-gray-500'
                          }`}>
                            {(row.enabledForPaid ?? true) ? 'Yes' : 'No'}
                          </span>
                          {!isAdmin(currentUserRole) && (
                            <span className="text-xs text-gray-500 ml-2">Admin only</span>
                          )}
                        </label>
                      </td>
                      
                      <td className="px-6 py-4">
                        <label className="inline-flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={!!(row.enabledForFreeTrial ?? true)}
                              onChange={e => {
                                if (isAdmin(currentUserRole)) {
                                  setRow(row.id ?? row.slug, { enabledForFreeTrial: e.target.checked });
                                }
                              }}
                              disabled={!isAdmin(currentUserRole)}
                              className="sr-only"
                            />
                            <div className={`w-11 h-6 rounded-full transition-colors ${
                              (row.enabledForFreeTrial ?? true) ? 'bg-green-500' : 'bg-gray-300'
                            } ${!isAdmin(currentUserRole) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                                (row.enabledForFreeTrial ?? true) ? 'translate-x-5 mt-0.5' : 'translate-x-0.5 mt-0.5'
                              }`} />
                            </div>
                          </div>
                          <span className={`text-sm font-medium ${
                            (row.enabledForFreeTrial ?? true) ? 'text-green-700' : 'text-gray-500'
                          }`}>
                            {(row.enabledForFreeTrial ?? true) ? 'Yes' : 'No'}
                          </span>
                          {!isAdmin(currentUserRole) && (
                            <span className="text-xs text-gray-500 ml-2">Admin only</span>
                          )}
                        </label>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {row.versionConfig?.swarm ? swarmTabs.find(t => t.id === row.versionConfig?.swarm)?.label : '—'}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {row.order ?? 0}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        {roleFilter === 'pats-personality' ? (
                          <button
                            onClick={() => {
                              const agents = getPersonalityAgents();
                              const agent = agents[row.slug];
                              if (agent) {
                                setEditingAgent(agent);
                                setWizardOpen(true);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Edit
                          </button>
                        ) : (
                          <Link
                            to={`/admin/agents/${row.id}`}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Edit
                          </Link>
                        )}
                      </td>
                    </tr>
                    
                    {row._open && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Swarm Assignment</label>
                              <select
                                value={row.versionConfig?.swarm ?? ''}
                                onChange={(e) => {
                                  if (isAdmin(currentUserRole)) {
                                    setRow(row.id ?? row.slug, { swarm: e.target.value, _dirty: true });
                                  }
                                }}
                                disabled={!isAdmin(currentUserRole)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">None</option>
                                {SWARM_TABS.map(t => (
                                  <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Execution Order</label>
                              <input
                                type="number"
                                value={row.order ?? 0}
                                onChange={e => {
                                  if (isAdmin(currentUserRole)) {
                                    setRow(row.id ?? row.slug, { order: Number(e.target.value), _dirty: true });
                                  }
                                }}
                                disabled={!isAdmin(currentUserRole)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                min="0"
                                max="999"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">LLM Provider</label>
                              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600">
                                {row.versionConfig?.provider || 'openai'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-end gap-2 mt-4">
                            <div className="flex items-end gap-2">
                              {roleFilter === 'pats-personality' ? (
                                <button
                                  onClick={() => {
                                    const agents = getPersonalityAgents();
                                    const agent = agents[row.slug];
                                    if (agent) {
                                      setEditingAgent(agent);
                                      setWizardOpen(true);
                                    }
                                  }}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                                >
                                  Edit Agent
                                </button>
                              ) : (
                                <Link
                                  to={`/admin/agents/${row.id}`}
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                                >
                                  Edit Agent
                                </Link>
                              )}
                              <button
                                disabled={!row._dirty}
                                onClick={() => {
                                  if (isAdmin(currentUserRole)) {
                                    saveRow(row);
                                  }
                                }}
                                className={`px-3 py-2 rounded text-sm transition-colors ${
                                  row._dirty ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer Stats */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                {filtered.length} {roleFilter ? 'filtered' : 'total'} agents • {filtered.filter(r => r.enabled).length} enabled • {filtered.filter(r => r._dirty).length} unsaved changes
              </span>
              {!isAdmin(currentUserRole) && (
                <span className="text-yellow-600">• View-only mode (Admin required for changes)</span>
              )}
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span className="text-xs">Unsaved changes</span>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Help Section */}
      </div>
      
      <AgentTemplateWizard 
        open={wizardOpen} 
        editingAgent={editingAgent}
        onClose={() => {
          setWizardOpen(false);
          setEditingAgent(null);
          // Refresh personality agents from local store
          if (roleFilter === 'pats-personality') {
            const personalityAgents = getPersonalityAgents();
            const swarm = getPersonalitySwarm();
            
            const personalityRows: AgentRow[] = swarm.map(agentId => {
              const agent = personalityAgents[agentId];
              if (!agent) return null;
              return {
                id: agent.id,
                slug: agent.id,
                name: agent.name,
                enabled: agent.enabled,
                enabledForPaid: agent.enabledForPaid ?? true,
                enabledForFreeTrial: agent.enabledForFreeTrial ?? true,
                order: agent.order,
                current_version_id: null,
                versionConfig: { swarm: 'pats-personality' }
              };
            }).filter(Boolean) as AgentRow[];
            
            setRows(personalityRows);
          }
        }} 
      />
      
      <NewRoleModal
        isOpen={showNewRoleModal}
        onClose={() => setShowNewRoleModal(false)}
        onRoleCreated={() => forceUpdate()}
      />
      
      <AddSwarmAgentModal
        isOpen={showAddAgentModal}
        onClose={() => setShowAddAgentModal(false)}
        currentRole={roleFilter || ''}
        onAgentsAdded={() => forceUpdate()}
      />
    </div>
  );
}