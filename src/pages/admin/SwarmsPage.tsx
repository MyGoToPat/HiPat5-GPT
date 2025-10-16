import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../lib/supabase';
import { Settings, ChevronRight, Edit2, Save, X, Power, PowerOff, Activity, Zap } from 'lucide-react';
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
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentConfig, setAgentConfig] = useState<any>(null);
  const [editingConfig, setEditingConfig] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
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
    setSelectedAgent(agent);
    setIsEditing(false);

    if (!agent.current_version_id) {
      setAgentConfig(null);
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
      setAgentConfig(config);
      setEditingConfig(JSON.stringify(config, null, 2));
    } catch (err: any) {
      toast.error('Failed to load config: ' + err.message);
    }
  }

  async function saveAgentConfig() {
    if (!selectedAgent || !selectedAgent.current_version_id) return;

    try {
      const newConfig = JSON.parse(editingConfig);

      const { error } = await getSupabase()
        .from('agent_versions')
        .update({
          config: newConfig,
          config_json: newConfig
        })
        .eq('id', selectedAgent.current_version_id);

      if (error) throw error;

      setAgentConfig(newConfig);
      setIsEditing(false);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Breadcrumbs items={[{ label: 'Admin', path: '/admin/users' }, { label: 'Swarm Management' }]} />

        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Swarm Management</h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-3xl">
                Configure agent swarms that power intelligent conversations. Each swarm processes specific interaction types.
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
                    setSelectedAgent(null);
                  }}
                  className={`relative px-6 py-4 font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{tab.label} Swarm</span>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {tab.active}/{tab.count}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            {currentSwarm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Agent Configuration</h2>
                  <p className="text-sm text-gray-600">
                    Toggle agents and adjust execution priority
                  </p>
                </div>

                <div className="hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
                          <th className="px-4 py-3 text-left font-semibold w-10"></th>
                          <th className="px-4 py-3 text-left font-semibold">Agent</th>
                          <th className="px-4 py-3 text-center font-semibold">Status</th>
                          <th className="px-4 py-3 text-center font-semibold">Order</th>
                          <th className="px-4 py-3 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentSwarm.agents.map((agent, idx) => (
                          <tr
                            key={agent.id}
                            className={`transition-colors ${
                              selectedAgent?.id === agent.id
                                ? 'bg-blue-50'
                                : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                            } hover:bg-blue-50/70`}
                          >
                            <td className="px-4 py-4">
                              <button
                                onClick={() => {
                                  if (selectedAgent?.id === agent.id) {
                                    setSelectedAgent(null);
                                  } else {
                                    loadAgentConfig(agent);
                                  }
                                }}
                                className="text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <ChevronRight className={`h-5 w-5 transition-transform ${
                                  selectedAgent?.id === agent.id ? 'rotate-90' : ''
                                }`} />
                              </button>
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
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => loadAgentConfig(agent)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="md:hidden divide-y divide-gray-100">
                  {currentSwarm.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-4 transition-colors ${
                        selectedAgent?.id === agent.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 truncate mb-1">
                            {agent.name}
                          </h3>
                          <p className="text-xs text-gray-500 font-mono">{agent.slug}</p>
                        </div>
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-bold text-gray-900">
                          {agent.order}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleAgent(agent)}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            agent.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {agent.active ? <Power size={14} /> : <PowerOff size={14} />}
                          {agent.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          onClick={() => loadAgentConfig(agent)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Edit2 size={14} />
                          Edit Config
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedAgent ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedAgent.name}</h2>
                      <p className="text-sm text-gray-600 mb-2">{selectedAgent.description}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700">
                          <span className="text-gray-500">Slug:</span>
                          <span className="font-mono">{selectedAgent.slug}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700">
                          <span className="text-gray-500">Priority:</span>
                          <span className="font-bold">{selectedAgent.order}</span>
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          selectedAgent.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedAgent.active ? <Zap size={12} /> : <PowerOff size={12} />}
                          {selectedAgent.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Agent Configuration</h3>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
                      >
                        <Edit2 size={16} />
                        Edit Configuration
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditingConfig(JSON.stringify(agentConfig, null, 2));
                          }}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-semibold transition-colors"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                        <button
                          onClick={saveAgentConfig}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
                        >
                          <Save size={16} />
                          Save Changes
                        </button>
                      </div>
                    )}
                  </div>

                  {agentConfig ? (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {isEditing ? (
                        <textarea
                          value={editingConfig}
                          onChange={(e) => setEditingConfig(e.target.value)}
                          className="w-full h-96 px-4 py-3 font-mono text-xs sm:text-sm bg-gray-900 text-green-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          spellCheck={false}
                          placeholder="Enter JSON configuration..."
                        />
                      ) : (
                        <pre className="w-full h-96 overflow-auto px-4 py-3 bg-gray-900 text-green-400 font-mono text-xs sm:text-sm">
                          {JSON.stringify(agentConfig, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-base font-medium text-gray-600">No configuration available</p>
                      <p className="text-sm text-gray-500 mt-1">This agent does not have a configuration file</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="text-center py-24">
                  <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <ChevronRight className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Select an Agent</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Choose an agent from the list to view and edit its configuration
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
