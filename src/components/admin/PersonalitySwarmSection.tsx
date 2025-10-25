import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getSupabase } from '../../lib/supabase';
import { ChevronDown, ChevronUp, Power, PowerOff, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

type PersonalityAgent = {
  id: string;
  name: string;
  enabled: boolean;
  phase: 'pre' | 'main' | 'post';
  order: number;
  promptRef: string;
};

type PersonalitySwarmSectionProps = {
  onAgentsLoaded?: (count: number, activeCount: number) => void;
};

export default function PersonalitySwarmSection({ onAgentsLoaded }: PersonalitySwarmSectionProps) {
  const [agents, setAgents] = useState<PersonalityAgent[]>([]);
  const [promptContents, setPromptContents] = useState<Record<string, string>>({});
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // TEMPORARY: Remove after verification
  console.count('render:PersonalitySwarmSection');

  // In-flight fetch guard to prevent duplicate concurrent loads
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadPersonalitySwarm();
  }, []);

  // Stable signature to detect meaningful agent changes
  const agentsSig = useMemo(
    () => agents.map(a => `${a.promptRef ?? a.id}|${a.enabled}|${a.order}`).join(','),
    [agents]
  );

  useEffect(() => {
    if (agents.length > 0 && onAgentsLoaded) {
      const activeCount = agents.filter(a => a.enabled).length;
      onAgentsLoaded(agents.length, activeCount);
    }
  }, [agentsSig, onAgentsLoaded]);

  async function loadPersonalitySwarm() {
    try {
      setLoading(true);
      const { data, error } = await getSupabase()
        .from('agent_configs')
        .select('config')
        .eq('agent_key', 'personality')
        .maybeSingle();

      if (error) throw error;

      if (data?.config?.agents) {
        const loadedAgents = data.config.agents as PersonalityAgent[];
        setAgents(loadedAgents);
        console.log('[PersonalitySwarm] Loaded', loadedAgents.length, 'agents');
      } else {
        console.warn('[PersonalitySwarm] No config found');
        toast.error('Personality swarm configuration not found');
      }
    } catch (err: any) {
      console.error('[PersonalitySwarm] Load error:', err);
      toast.error('Failed to load personality swarm: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const loadPromptContent = useCallback(async (promptRef: string) => {
    // Guard: skip if already cached or currently fetching
    if (promptContents[promptRef] || inFlightRef.current.has(promptRef)) return;

    inFlightRef.current.add(promptRef);
    try {
      const { data, error } = await getSupabase()
        .from('agent_prompts')
        .select('content')
        .eq('agent_id', promptRef)
        .eq('status', 'published')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.content) {
        setPromptContents(prev => ({ ...prev, [promptRef]: data.content }));
      }
    } catch (err: any) {
      console.error('[PersonalitySwarm] Failed to load prompt:', err);
    } finally {
      inFlightRef.current.delete(promptRef);
    }
  }, []); // Empty deps - use functional state update inside

  const toggleExpand = useCallback(async (agent: PersonalityAgent) => {
    if (expandedAgentId === agent.id) {
      setExpandedAgentId(null);
    } else {
      setExpandedAgentId(agent.id);
      // loadPromptContent has internal cache check, no need to check promptContents here
      await loadPromptContent(agent.promptRef);
    }
  }, [expandedAgentId, loadPromptContent]);

  async function toggleAgent(agent: PersonalityAgent) {
    try {
      const { data: currentConfig, error: fetchError } = await getSupabase()
        .from('agent_configs')
        .select('config')
        .eq('agent_key', 'personality')
        .single();

      if (fetchError) throw fetchError;

      const updatedAgents = currentConfig.config.agents.map((a: PersonalityAgent) =>
        a.id === agent.id ? { ...a, enabled: !a.enabled } : a
      );

      const { error: updateError } = await getSupabase()
        .from('agent_configs')
        .update({
          config: {
            ...currentConfig.config,
            agents: updatedAgents
          }
        })
        .eq('agent_key', 'personality');

      if (updateError) throw updateError;

      setAgents(updatedAgents);
      toast.success(`Agent ${!agent.enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      console.error('[PersonalitySwarm] Toggle error:', err);
      toast.error('Failed to toggle agent: ' + err.message);
    }
  }

  const getPhaseColor = useCallback((phase: string) => {
    switch (phase) {
      case 'pre': return 'bg-blue-100 text-blue-700';
      case 'main': return 'bg-purple-100 text-purple-700';
      case 'post': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Loading personality swarm...</p>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 bg-yellow-50 rounded-lg border-2 border-yellow-200">
        <Zap className="h-12 w-12 mx-auto mb-3 text-yellow-600" />
        <p className="text-base font-medium text-yellow-900">No personality agents found</p>
        <p className="text-sm text-yellow-700 mt-1">The personality swarm configuration is missing from the database.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-900 text-white text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left font-semibold w-12"></th>
            <th className="px-4 py-3 text-left font-semibold">Agent</th>
            <th className="px-4 py-3 text-center font-semibold">Phase</th>
            <th className="px-4 py-3 text-center font-semibold">Status</th>
            <th className="px-4 py-3 text-center font-semibold">Order</th>
            <th className="px-4 py-3 text-left font-semibold">Prompt Reference</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, idx) => (
            <React.Fragment key={`agent-${agent.promptRef ?? agent.id ?? `${agent.name}-${agent.order}-${agent.phase}`}`}>
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
                    <div className="text-xs text-gray-500 font-mono">{agent.id}</div>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPhaseColor(agent.phase)}`}>
                    {agent.phase.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAgent(agent);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      agent.enabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {agent.enabled ? (
                      <>
                        <Power size={12} />
                        Enabled
                      </>
                    ) : (
                      <>
                        <PowerOff size={12} />
                        Disabled
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-900">
                    {agent.order}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                  {agent.promptRef}
                </td>
              </tr>
              {expandedAgentId === agent.id && (
                <tr key={`expanded-${agent.promptRef}`} className="bg-gray-50">
                  <td colSpan={6} className="px-4 py-6">
                    <div className="max-w-full">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Prompt Content for {agent.name}</h3>
                      {promptContents[agent.promptRef] ? (
                        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs overflow-auto max-h-[400px] whitespace-pre-wrap">
                          {promptContents[agent.promptRef]}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">Loading prompt content...</p>
                        </div>
                      )}
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Note:</strong> This prompt is loaded from the <code className="bg-blue-100 px-1 rounded">agent_prompts</code> table.
                          Changes to this content should be made via the personality editor or database migrations.
                        </p>
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
  );
}
