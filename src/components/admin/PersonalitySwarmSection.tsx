import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../../lib/supabase';
import { ChevronDown, ChevronUp, Power, PowerOff, Zap, Edit2, Plus, X, Save } from 'lucide-react';
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
  onAgentsLoaded?: (counts: { total: number; active: number }) => void;
};

export default function PersonalitySwarmSection({ onAgentsLoaded }: PersonalitySwarmSectionProps) {
  const [agents, setAgents] = useState<PersonalityAgent[]>([]);
  const [promptContents, setPromptContents] = useState<Record<string, string>>({});
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPromptRef, setEditingPromptRef] = useState<string | null>(null);
  const [editingPromptContent, setEditingPromptContent] = useState<string>('');
  const [savingPrompt, setSavingPrompt] = useState(false); // ✅ Add saving state
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [newAgent, setNewAgent] = useState({
    promptRef: '',
    name: '',
    phase: 'pre' as 'pre' | 'main' | 'post',
    order: 50,
    enabled: true,
    content: ''
  });

  // In-flight fetch guard to prevent duplicate concurrent loads
  const inFlightRef = useRef<Set<string>>(new Set());

  // Guard to notify parent exactly once after first successful load
  const notifiedRef = useRef(false);

  useEffect(() => {
    loadPersonalityPrompts();
  }, []);

  async function loadPersonalityPrompts() {
    try {
      setLoading(true);
      const { data, error } = await getSupabase()
        .from('personality_prompts')
        .select('prompt_code, title, phase, "order", model, version, enabled, content')
        .eq('agent', 'pat')
        .order('phase', { ascending: true })
        .order('"order"', { ascending: true });

      if (error) throw error;

      if (data) {
        // Transform personality_prompts rows to PersonalityAgent format for UI compatibility
        const loadedAgents: PersonalityAgent[] = data.map(row => ({
          id: row.prompt_code,
          name: row.title,
          enabled: row.enabled,
          phase: row.phase as 'pre' | 'main' | 'post',
          order: row["order"],
          promptRef: row.prompt_code
        }));

        setAgents(loadedAgents);
        console.log('[PersonalitySwarm] Loaded', loadedAgents.length, 'prompts');

        // Notify parent exactly once after first successful load
        if (!notifiedRef.current) {
          notifiedRef.current = true;
          onAgentsLoaded?.({
            total: loadedAgents.length,
            active: loadedAgents.filter(a => a.enabled).length
          });
        }
      } else {
        console.warn('[PersonalitySwarm] No prompts found');
        toast.error('Personality prompts not found');
      }
    } catch (err: any) {
      console.error('[PersonalitySwarm] Load error:', err);
      toast.error('Failed to load personality prompts: ' + err.message);
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
        .from('personality_prompts')
        .select('content')
        .eq('prompt_code', promptRef)
        .eq('agent', 'pat')
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
      const { error: updateError } = await getSupabase()
        .from('personality_prompts')
        .update({ enabled: !agent.enabled })
        .eq('prompt_code', agent.promptRef)
        .eq('agent', 'pat');

      if (updateError) throw updateError;

      // Update local state
      setAgents(prev => prev.map(a =>
        a.id === agent.id ? { ...a, enabled: !a.enabled } : a
      ));

      toast.success(`Prompt ${!agent.enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      console.error('[PersonalitySwarm] Toggle error:', err);
      toast.error('Failed to toggle prompt: ' + err.message);
    }
  }

  async function openEditModal(agent: PersonalityAgent) {
    try {
      // Load current prompt content
      const { data, error } = await getSupabase()
        .from('personality_prompts')
        .select('content')
        .eq('prompt_code', agent.promptRef)
        .eq('agent', 'pat')
        .maybeSingle();

      if (error) throw error;
      if (!data?.content) {
        toast.error('Prompt content not found');
        return;
      }

      setEditingPromptRef(agent.promptRef);
      setEditingPromptContent(data.content);
    } catch (err: any) {
      console.error('[PersonalitySwarm] Failed to load prompt for editing:', err);
      toast.error('Failed to load prompt: ' + err.message);
    }
  }

  async function savePrompt() {
    if (!editingPromptRef || !editingPromptContent.trim()) {
      toast.error('Prompt content cannot be empty');
      return;
    }

    if (savingPrompt) return; // Prevent double-save

    setSavingPrompt(true);
    try {
      const { error } = await getSupabase()
        .from('personality_prompts')
        .update({
          content: editingPromptContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('prompt_code', editingPromptRef)
        .eq('agent', 'pat');

      if (error) throw error;

      // Success - refresh prompt content cache
      setPromptContents(prev => ({ ...prev, [editingPromptRef]: editingPromptContent.trim() }));
      setEditingPromptRef(null);
      setEditingPromptContent('');
      toast.success('Prompt updated');

      // Reload prompts to ensure UI is in sync
      await loadPersonalityPrompts();
    } catch (err: any) {
      console.error('[PersonalitySwarm] Failed to save prompt:', err);
      toast.error('Failed to save prompt: ' + (err.message || String(err)));
    } finally {
      setSavingPrompt(false);
    }
  }

  async function addAgent() {
    if (!newAgent.promptRef.trim() || !newAgent.name.trim() || !newAgent.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const supabase = getSupabase();

      // Step 1: Create/update prompt using supabase.functions.invoke
      const { data: promptData, error: promptError } = await supabase.functions.invoke('swarm-admin-api', {
        body: {
          op: 'createPrompt',
          agent_id: newAgent.promptRef.trim(),
          content: newAgent.content.trim(),
          status: 'published',
          phase: newAgent.phase,
          order: newAgent.order
        }
      });

      if (promptError) {
        console.error('[PersonalitySwarm] Prompt creation error:', promptError);
        throw new Error(promptError.message || 'Failed to create prompt');
      }

      // Check for error in response data
      if (promptData && !promptData.ok && promptData.error) {
        console.error('[PersonalitySwarm] Function returned error:', promptData);
        throw new Error(promptData.error || 'Failed to create prompt');
      }

      // Step 2: Add agent to swarm config using supabase.functions.invoke
      const { data: agentData, error: agentError } = await supabase.functions.invoke('swarm-admin-api', {
        body: {
          op: 'addAgentToSwarm',
          agentKey: 'personality',
          promptRef: newAgent.promptRef.trim(),
          name: newAgent.name.trim(),
          phase: newAgent.phase,
          order: newAgent.order,
          enabled: newAgent.enabled
        }
      });

      if (agentError) {
        console.error('[PersonalitySwarm] Agent config error:', agentError);
        throw new Error(agentError.message || 'Failed to add agent to swarm');
      }

      // Check for error in response data
      if (agentData && !agentData.ok && agentData.error) {
        console.error('[PersonalitySwarm] Function returned error:', agentData);
        throw new Error(agentData.error || 'Failed to add agent to swarm');
      }

      // Refresh swarm list
      await loadPersonalitySwarm();
      
      // Reset form and close modal
      const addedPromptRef = newAgent.promptRef.trim();
      setNewAgent({
        promptRef: '',
        name: '',
        phase: 'pre',
        order: 50,
        enabled: true,
        content: ''
      });
      setShowAddAgentModal(false);
      toast.success('Agent added successfully');

      // Scroll to new agent row
      setTimeout(() => {
        const row = document.querySelector(`[data-testid="agent-${addedPromptRef}"]`);
        row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err: any) {
      console.error('[PersonalitySwarm] Failed to add agent:', err);
      toast.error('Failed to add agent: ' + (err.message || String(err)));
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
    <>
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Personality Swarm Agents</h2>
        <button
          data-testid="add-agent"
          onClick={() => setShowAddAgentModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Agent
        </button>
      </div>

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
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent, idx) => (
              <React.Fragment key={`agent-${agent.promptRef ?? agent.id ?? `${agent.name}-${agent.order}-${agent.phase}`}`}>
                <tr
                  data-testid={`agent-${agent.promptRef}`}
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
                  <td className="px-4 py-4 text-center">
                    <button
                      data-testid={`edit-${agent.promptRef}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(agent);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="Edit prompt"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                  </td>
                </tr>
                {expandedAgentId === agent.id && (
                  <tr key={`expanded-${agent.promptRef}`} className="bg-gray-50">
                    <td colSpan={7} className="px-4 py-6">
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
                            <strong>Note:</strong> This prompt is loaded from the <code className="bg-blue-100 px-1 rounded">personality_prompts</code> table.
                            DB is the single source of truth. Click "Edit" to modify the prompt content.
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

      {/* Edit Prompt Modal */}
      {editingPromptRef && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setEditingPromptRef(null)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit Prompt: {editingPromptRef}</h3>
              <button onClick={() => setEditingPromptRef(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <textarea
              data-testid="prompt-editor"
              value={editingPromptContent}
              onChange={(e) => setEditingPromptContent(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm"
              placeholder="Enter prompt content..."
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingPromptRef(null);
                  setEditingPromptContent('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                data-testid="prompt-save"
                onClick={savePrompt}
                disabled={savingPrompt}
                className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ${
                  savingPrompt ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Save size={18} />
                {savingPrompt ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddAgentModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add New Agent</h3>
              <button onClick={() => setShowAddAgentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Reference *</label>
                <input
                  type="text"
                  value={newAgent.promptRef}
                  onChange={(e) => setNewAgent({ ...newAgent, promptRef: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="PERSONALITY_ROUTER"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Intelligent Router"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phase *</label>
                  <select
                    value={newAgent.phase}
                    onChange={(e) => setNewAgent({ ...newAgent, phase: e.target.value as 'pre' | 'main' | 'post' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="pre">Pre</option>
                    <option value="main">Main</option>
                    <option value="post">Post</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order *</label>
                  <input
                    type="number"
                    value={newAgent.order}
                    onChange={(e) => setNewAgent({ ...newAgent, order: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={newAgent.enabled}
                  onChange={(e) => setNewAgent({ ...newAgent, enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="enabled" className="text-sm text-gray-700">Enabled</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Content *</label>
                <textarea
                  value={newAgent.content}
                  onChange={(e) => setNewAgent({ ...newAgent, content: e.target.value })}
                  className="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="Enter prompt content..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddAgentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addAgent}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} />
                Add Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
