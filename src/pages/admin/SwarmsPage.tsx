import React, { useState, useEffect } from 'react';
import { getSupabase } from '../../lib/supabase';
import { Settings, ChevronRight, Edit2, Save, X } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Swarm Management</h1>
          <p className="mt-2 text-gray-600">
            View and configure all agent swarms. Each swarm processes specific types of user interactions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Swarm List */}
          <div className="lg:col-span-1 space-y-6">
            {swarms.map((swarm) => (
              <div key={swarm.name} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900 capitalize">
                    {swarm.name} Swarm
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {swarm.agents.length} agent{swarm.agents.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="divide-y divide-gray-100">
                  {swarm.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedAgent?.id === agent.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => loadAgentConfig(agent)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {agent.name}
                            </span>
                            {selectedAgent?.id === agent.id && (
                              <ChevronRight className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {agent.slug}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAgent(agent);
                          }}
                          className={`ml-2 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                            agent.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {agent.active ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right: Agent Details */}
          <div className="lg:col-span-2">
            {selectedAgent ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedAgent.name}</h2>
                      <p className="text-sm text-gray-600 mt-1">{selectedAgent.description}</p>
                      <div className="flex items-center gap-4 mt-3">
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

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
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
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveAgentConfig}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
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
                          className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          spellCheck={false}
                        />
                      ) : (
                        <pre className="w-full h-96 overflow-auto px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm">
                          {JSON.stringify(agentConfig, null, 2)}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Settings className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No configuration available for this agent</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Select an Agent
                </h3>
                <p className="text-gray-600">
                  Choose an agent from the left to view and edit its configuration
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
