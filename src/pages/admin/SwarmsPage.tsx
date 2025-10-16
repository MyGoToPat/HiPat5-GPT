import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../lib/supabase';
import { Settings, ChevronDown, Edit2, Save, X, Power, PowerOff, Activity, Zap, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../components/common/Breadcrumbs';

type Agent = {
  id: string;
  name: string;
  slug: string;
  category: string;
  active: boolean;
  description: string;
  current_version_id: string;
  order: number;
};

type AgentVersion = {
  id: string;
  config: any;
  config_json: any;
};

type SwarmCategory = {
  name: string;
  agents: Agent[];
};

export default function SwarmsPage() {
  const [swarms, setSwarms] = useState<SwarmCategory[]>([]);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [agentConfigs, setAgentConfigs] = useState<Record<string, any>>({});
  const [editingConfigs, setEditingConfigs] = useState<Record<string, string>>({});
  const [editingAgentIds, setEditingAgentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('macro');

  useEffect(() => {
    loadSwarms();
  }, []);

  async function loadSwarms() {
    try {
      const { data: agents, error } = await getSupabase()
        .from('agents')
        .select('*')
        .order('category', { ascending: true })
        .order('order', { ascending: true });

      if (error) throw error;

      const grouped = (agents || []).reduce((acc, agent) => {
        const cat = agent.category || 'general';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(agent);
        return acc;
      }, {} as Record<string, Agent[]>);

      const swarmsData: SwarmCategory[] = Object.entries(grouped).map(([name, agents]) => ({
        name,
        agents
      }));

      setSwarms(swarmsData);
    } catch (err: any) {
      toast.error('Failed to load swarms: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAgentConfig(agent: Agent) {
    if (!agent.current_version_id) {
      setAgentConfigs(prev => ({ ...prev, [agent.id]: null }));
      return;
    }

    try {
      const { data, error } = await getSupabase()
        .from('agent_versions')
        .select('*')
        .eq('id', agent.current_version_id)
        .single();

      if (error) throw error;

      const config = data.config_json || data.config || {};
      setAgentConfigs(prev => ({ ...prev, [agent.id]: config }));
      setEditingConfigs(prev => ({ ...prev, [agent.id]: JSON.stringify(config, null, 2) }));
    } catch (err: any) {
      toast.error('Failed to load config: ' + err.message);
    }
  }

  async function toggleExpand(agent: Agent) {
    if (expandedAgentId === agent.id) {
      setExpandedAgentId(null);
    } else {
      setExpandedAgentId(agent.id);
      if (!agentConfigs[agent.id]) {
        await loadAgentConfig(agent);
      }
    }
  }

  async function saveAgentConfig(agent: Agent) {
    if (!agent.current_version_id) return;

    try {
      const newConfig = JSON.parse(editingConfigs[agent.id]);

      const { error } = await getSupabase()
        .from('agent_versions')
        .update({
          config: newConfig,
          config_json: newConfig
        })
        .eq('id', agent.current_version_id);

      if (error) throw error;

      setAgentConfigs(prev => ({ ...prev, [agent.id]: newConfig }));
      setEditingAgentIds(prev => {
        const next = new Set(prev);
        next.delete(agent.id);
        return next;
      });
      toast.success('Configuration saved');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    }
  }

  async function toggleAgent(agent: Agent) {
    try {
      const { error } = await getSupabase()
        .from('agents')
        .update({ active: !agent.active })
        .eq('id', agent.id);

      if (error) throw error;

      await loadSwarms();
      toast.success(`Agent ${!agent.active ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error('Failed to toggle: ' + err.message);
    }
  }

  function startEditing(agentId: string) {
    setEditingAgentIds(prev => new Set(prev).add(agentId));
  }

  function cancelEditing(agentId: string) {
    setEditingAgentIds(prev => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
    setEditingConfigs(prev => ({
      ...prev,
      [agentId]: JSON.stringify(agentConfigs[agentId], null, 2)
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading swarms...</p>
        </div>
      </div>
    );
  }

  const currentSwarm = swarms.find(s => s.name.toLowerCase() === activeTab);
  const tabs = swarms.map(s => ({
    id: s.name.toLowerCase(),
    label: s.name.charAt(0).toUpperCase() + s.name.slice(1),
    count: s.agents.length,
    active: s.agents.filter(a => a.active).length
  }));

  const totalAgents = swarms.reduce((sum, s) => sum + s.agents.length, 0);
  const activeAgents = swarms.reduce((sum, s) => sum + s.agents.filter(a => a.active).length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Breadcrumbs items={[{ label: 'Admin', path: '/admin/users' }, { label: 'Swarm Management' }]} />

        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Swarm Management</h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-3xl">
                Configure agent swarms that power intelligent conversations. Click any row to expand and edit configuration.
              </p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{activeAgents}/{totalAgents}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">Active Agents</div>
              </div>
              <Activity className="text-blue-600" size={32} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex min-w-max">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setExpandedAgentId(null);
                  }}
                  className={`relative px-6 py-4 font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{tab.label} Swarm</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tab.active}/{tab.count}
                    </span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {currentSwarm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Agent Configuration</h2>
              <p className="text-sm text-gray-600">
                Click any row to expand and view/edit configuration
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-semibold w-12"></th>
                    <th className="px-4 py-3 text-left font-semibold">Agent</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Order</th>
                    <th className="px-4 py-3 text-left font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSwarm.agents.map((agent, idx) => (
                    <React.Fragment key={agent.id}>
                      <tr
                        onClick={() => toggleExpand(agent)}
                        className={`cursor-pointer transition-colors ${
                          expandedAgentId === agent.id
                            ? 'bg-blue-50 border-l-4 border-blue-600'
                            : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'
                        }`}
                      >
                        <td className="px-4 py-4">
                          {expandedAgentId === agent.id ? (
                            <ChevronUp className="h-5 w-5 text-blue-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {agent.name}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">{agent.slug}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAgent(agent);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              agent.active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {agent.active ? (
                              <>
                                <Power size={12} />
                                Active
                              </>
                            ) : (
                              <>
                                <PowerOff size={12} />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-900">
                            {agent.order}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {agent.description}
                        </td>
                      </tr>
                      {expandedAgentId === agent.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-4 py-6">
                            <div className="max-w-full">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Configuration for {agent.name}</h3>
                                {!editingAgentIds.has(agent.id) ? (
                                  <button
                                    onClick={() => startEditing(agent.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors shadow-sm"
                                  >
                                    <Edit2 size={16} />
                                    Edit Configuration
                                  </button>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => cancelEditing(agent.id)}
                                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-semibold transition-colors"
                                    >
                                      <X size={16} />
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => saveAgentConfig(agent)}
                                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition-colors shadow-sm"
                                    >
                                      <Save size={16} />
                                      Save Changes
                                    </button>
                                  </div>
                                )}
                              </div>

                              {agentConfigs[agent.id] ? (
                                <div className="border border-gray-300 rounded-lg overflow-hidden">
                                  {editingAgentIds.has(agent.id) ? (
                                    <textarea
                                      value={editingConfigs[agent.id] || ''}
                                      onChange={(e) => setEditingConfigs(prev => ({ ...prev, [agent.id]: e.target.value }))}
                                      className="w-full px-4 py-3 font-mono text-sm bg-gray-900 text-green-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      style={{ height: 'auto', minHeight: '400px', maxHeight: '800px' }}
                                      spellCheck={false}
                                      placeholder="Enter JSON configuration..."
                                    />
                                  ) : (
                                    <pre className="w-full px-4 py-3 bg-gray-900 text-green-400 font-mono text-sm overflow-x-auto" style={{ minHeight: '400px', maxHeight: '800px' }}>
                                      {JSON.stringify(agentConfigs[agent.id], null, 2)}
                                    </pre>
                                  )}
                                </div>
                              ) : agentConfigs[agent.id] === null ? (
                                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                                  <Settings className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                                  <p className="text-base font-medium text-gray-600">No configuration available</p>
                                  <p className="text-sm text-gray-500 mt-1">This agent does not have a configuration file</p>
                                </div>
                              ) : (
                                <div className="text-center py-12">
                                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                  <p className="text-sm text-gray-600">Loading configuration...</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
