import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Power,
  Edit2,
  BarChart3,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';

interface Agent {
  id: string;
  agent_id: string;
  title: string;
  model: string;
  phase: string;
  exec_order: number;
  status: 'draft' | 'published';
  agent_type: string;
  temperature: number;
  max_tokens: number;
  is_optional: boolean;
  avg_latency_ms: number;
  success_rate: number;
  cost_estimate_cents: number;
}

interface SwarmAgentsListProps {
  swarmId: string;
  writeEnabled: boolean;
}

export default function SwarmAgentsList({ swarmId, writeEnabled }: SwarmAgentsListProps) {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['pre', 'core', 'filter', 'presenter', 'post', 'render']));
  const [agentStats, setAgentStats] = useState<Record<string, any>>({});

  const phases = [
    { id: 'pre', name: 'Pre-Processing', color: 'blue' },
    { id: 'core', name: 'Core Processing', color: 'green' },
    { id: 'filter', name: 'Filtering', color: 'yellow' },
    { id: 'presenter', name: 'Presentation', color: 'purple' },
    { id: 'post', name: 'Post-Processing', color: 'pink' },
    { id: 'render', name: 'Rendering', color: 'gray' }
  ];

  useEffect(() => {
    loadAgents();
  }, [swarmId]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();

      // Load all agents for this swarm
      const { data: agentData, error } = await supabase
        .from('agent_prompts')
        .select('*')
        .order('phase')
        .order('exec_order');

      if (error) throw error;
      setAgents(agentData || []);

      // Load performance stats for last 7 days
      const stats: Record<string, any> = {};
      for (const agent of (agentData || [])) {
        try {
          const { data: perfData } = await supabase
            .rpc('get_agent_performance_stats', {
              p_agent_prompt_id: agent.id,
              p_days: 7
            });
          if (perfData && perfData.length > 0) {
            stats[agent.id] = perfData[0];
          }
        } catch (e) {
          console.error(`Failed to load stats for agent ${agent.id}`, e);
        }
      }
      setAgentStats(stats);
    } catch (e: any) {
      toast.error('Failed to load agents: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const toggleAgentEnabled = async (agentId: string, currentEnabled: boolean) => {
    if (!writeEnabled) {
      toast.error('Write operations are disabled in this environment');
      return;
    }

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('agent_prompts')
        .update({ is_optional: !currentEnabled })
        .eq('id', agentId);

      if (error) throw error;
      toast.success(`Agent ${currentEnabled ? 'disabled' : 'enabled'}`);
      await loadAgents();
    } catch (e: any) {
      toast.error('Failed to update agent: ' + e.message);
    }
  };

  const getPhaseAgents = (phaseId: string) => {
    return agents.filter(a => a.phase === phaseId);
  };

  const getPhaseColor = (phaseId: string) => {
    const phase = phases.find(p => p.id === phaseId);
    return phase?.color || 'gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Agent Pipeline</h3>
          <p className="text-sm text-gray-600 mt-1">
            {agents.length} agents organized by execution phase
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Power className="h-4 w-4" />
          <span>Toggle agents on/off to test performance impact</span>
        </div>
      </div>

      {phases.map(phase => {
        const phaseAgents = getPhaseAgents(phase.id);
        const isExpanded = expandedPhases.has(phase.id);
        const hasAgents = phaseAgents.length > 0;

        const phaseStats = phaseAgents.reduce((acc, agent) => {
          const stats = agentStats[agent.id];
          if (stats) {
            acc.totalLatency += stats.avg_latency_ms || 0;
            acc.totalCost += stats.total_cost_cents || 0;
            acc.avgSuccessRate += stats.success_rate || 0;
            acc.count += 1;
          }
          return acc;
        }, { totalLatency: 0, totalCost: 0, avgSuccessRate: 0, count: 0 });

        return (
          <div
            key={phase.id}
            className={`border rounded-lg overflow-hidden ${
              hasAgents ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
            }`}
          >
            {/* Phase Header */}
            <button
              onClick={() => hasAgents && togglePhase(phase.id)}
              disabled={!hasAgents}
              className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                hasAgents ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {hasAgents ? (
                  isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )
                ) : (
                  <div className="h-5 w-5" />
                )}
                <div className={`px-3 py-1 rounded-full text-xs font-medium bg-${phase.color}-100 text-${phase.color}-700`}>
                  {phase.name}
                </div>
                <span className="text-sm text-gray-600">
                  {phaseAgents.length} {phaseAgents.length === 1 ? 'agent' : 'agents'}
                </span>
              </div>

              {hasAgents && phaseStats.count > 0 && (
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{phaseStats.totalLatency.toFixed(0)}ms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">${(phaseStats.totalCost / 100).toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">
                      {phaseStats.count > 0 ? (phaseStats.avgSuccessRate / phaseStats.count).toFixed(1) : 0}%
                    </span>
                  </div>
                </div>
              )}
            </button>

            {/* Phase Agents */}
            {isExpanded && hasAgents && (
              <div className="border-t border-gray-200 bg-white">
                {phaseAgents.map((agent, index) => {
                  const stats = agentStats[agent.id];
                  const isEnabled = !agent.is_optional;

                  return (
                    <div
                      key={agent.id}
                      className={`p-4 ${
                        index < phaseAgents.length - 1 ? 'border-b border-gray-100' : ''
                      } ${!isEnabled ? 'bg-gray-50 opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {/* Enable/Disable Toggle */}
                            <button
                              onClick={() => toggleAgentEnabled(agent.id, isEnabled)}
                              disabled={!writeEnabled}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isEnabled ? 'bg-blue-600' : 'bg-gray-300'
                              } ${!writeEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                              title={writeEnabled ? (isEnabled ? 'Disable agent' : 'Enable agent') : 'Write operations disabled'}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{agent.title}</h4>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    agent.status === 'published'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}
                                >
                                  {agent.status}
                                </span>
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                  {agent.agent_type}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                                <span>ID: {agent.agent_id}</span>
                                <span>Model: {agent.model}</span>
                                <span>Temp: {agent.temperature}</span>
                                <span>Tokens: {agent.max_tokens}</span>
                                <span>Order: {agent.exec_order}</span>
                              </div>
                            </div>
                          </div>

                          {/* Performance Stats */}
                          {stats && (
                            <div className="flex items-center gap-6 mt-3 ml-14">
                              <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">{stats.avg_latency_ms?.toFixed(0) || 0}ms avg</span>
                                <span className="text-gray-500">({stats.p95_latency_ms?.toFixed(0) || 0}ms p95)</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">{stats.success_rate?.toFixed(1) || 0}%</span>
                                <span className="text-gray-500">({stats.total_executions || 0} runs)</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-700">${((stats.total_cost_cents || 0) / 100).toFixed(4)}</span>
                                <span className="text-gray-500">({(stats.total_tokens || 0).toLocaleString()} tokens)</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => navigate(`/admin/agents/${agent.id}/performance`)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="View detailed performance metrics"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/agents/${agent.id}`)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit agent configuration"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {!isEnabled && (
                        <div className="flex items-center gap-2 mt-3 ml-14 text-sm text-gray-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>This agent is currently disabled and will be skipped during execution</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!hasAgents && (
              <div className="p-4 text-center text-sm text-gray-500">
                No agents configured for this phase
              </div>
            )}
          </div>
        );
      })}

      {/* Summary Stats */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Pipeline Summary</h4>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Total Agents:</span>
            <span className="ml-2 font-medium text-blue-900">{agents.length}</span>
          </div>
          <div>
            <span className="text-blue-700">Enabled:</span>
            <span className="ml-2 font-medium text-blue-900">
              {agents.filter(a => !a.is_optional).length}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Disabled:</span>
            <span className="ml-2 font-medium text-blue-900">
              {agents.filter(a => a.is_optional).length}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Draft Status:</span>
            <span className="ml-2 font-medium text-blue-900">
              {agents.filter(a => a.status === 'draft').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
