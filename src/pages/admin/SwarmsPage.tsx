import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../lib/supabase';
import { Settings, ChevronRight, Edit2, Save, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

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

      // Group by category
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
        <div className="text-gray-600">Loading swarms...</div>
      </div>
    );
  }

  // Get the currently active swarm based on tab
  const currentSwarm = swarms.find(s => s.name.toLowerCase() === activeTab);
  const tabs = swarms.map(s => ({
    id: s.name.toLowerCase(),
    label: `${s.name.charAt(0).toUpperCase() + s.name.slice(1)} Swarm`,
    count: s.agents.length
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Swarm Management</h1>
          <p className="mt-2 text-gray-600">
            View and configure all agent swarms. Each swarm processes specific types of user interactions.
          </p>
        </div>

        {/* Tabs - Horizontal scroll on mobile */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedAgent(null);
                }}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex-shrink-0`}
              >
                {tab.label}
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Agent List for Active Tab */}
          <div className="lg:col-span-1">
            {currentSwarm && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Agent Configuration</h2>
                  <p className="text-sm text-gray-600 mt-1 hidden sm:block">
                    Toggle enabled status, adjust order for execution priority, then click Save on any changed row to persist changes.
                  </p>
                </div>

                {/* Desktop: Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900 text-white text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold w-8">
                          <ChevronDown className="h-4 w-4" />
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">Agent</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Order</th>
                        <th className="px-4 py-3 text-left font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentSwarm.agents.map((agent) => (
                        <tr
                          key={agent.id}
                          className={`hover:bg-gray-50 ${
                            selectedAgent?.id === agent.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                if (selectedAgent?.id === agent.id) {
                                  setSelectedAgent(null);
                                } else {
                                  loadAgentConfig(agent);
                                }
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <ChevronRight className={`h-4 w-4 transition-transform ${
                                selectedAgent?.id === agent.id ? 'rotate-90' : ''
                              }`} />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {agent.name}
                              </div>
                              <div className="text-xs text-gray-500">{agent.slug}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAgent(agent);
                              }}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                agent.active ? 'bg-green-600' : 'bg-gray-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  agent.active ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900">{agent.order}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => loadAgentConfig(agent)}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {currentSwarm.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-4 ${
                        selectedAgent?.id === agent.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {agent.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">{agent.slug}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-600">
                              Order: <span className="font-medium">{agent.order}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAgent(agent);
                            }}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                              agent.active ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                agent.active ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => loadAgentConfig(agent)}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Edit Config
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Agent Details */}
          <div className="lg:col-span-2">
            {selectedAgent ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedAgent.name}</h2>
                      <p className="text-sm text-gray-600 mt-1">{selectedAgent.description}</p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
                        <span className="text-xs text-gray-500">
                          <span className="font-medium">Slug:</span> {selectedAgent.slug}
                        </span>
                        <span className="text-xs text-gray-500">
                          <span className="font-medium">Order:</span> {selectedAgent.order}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        <Edit2 className="h-4 w-4" />
                        Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setEditingConfig(JSON.stringify(agentConfig, null, 2));
                          }}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveAgentConfig}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {agentConfig ? (
                    <div>
                      {isEditing ? (
                        <textarea
                          value={editingConfig}
                          onChange={(e) => setEditingConfig(e.target.value)}
                          className="w-full h-64 sm:h-96 px-3 sm:px-4 py-3 border border-gray-300 rounded-lg font-mono text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          spellCheck={false}
                        />
                      ) : (
                        <pre className="w-full h-64 sm:h-96 overflow-auto px-3 sm:px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs sm:text-sm">
                          {JSON.stringify(agentConfig, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Settings className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm">No configuration available for this agent</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
