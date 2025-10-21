import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Settings,
  Save,
  X,
  Play,
  BarChart3,
  Clock,
  DollarSign,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Copy,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';

interface AgentConfig {
  id: string;
  agent_id: string;
  title: string;
  content: string;
  model: string;
  phase: string;
  exec_order: number;
  status: 'draft' | 'published';
  version: number;
  temperature: number;
  max_tokens: number;
  response_format: string;
  timeout_ms: number;
  retry_enabled: boolean;
  max_retries: number;
  fallback_behavior: string;
  is_optional: boolean;
  agent_type: string;
  voice_config: Record<string, any>;
  custom_config: Record<string, any>;
  cost_estimate_cents: number;
  avg_latency_ms: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}

interface PerformanceStats {
  avg_latency_ms: number;
  total_executions: number;
  success_rate: number;
  total_tokens: number;
  total_cost_cents: number;
  p95_latency_ms: number;
}

export default function AgentConfigPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAgent, setEditedAgent] = useState<Partial<AgentConfig>>({});
  const [activeTab, setActiveTab] = useState<'prompt' | 'config' | 'performance' | 'testing'>('prompt');
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState<any>(null);
  const [testRunning, setTestRunning] = useState(false);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  useEffect(() => {
    if (agent && activeTab === 'performance') {
      loadPerformanceStats();
    }
  }, [agent, activeTab]);

  const loadAgent = async () => {
    try {
      setLoading(true);
      const supabase = getSupabase();

      const { data, error } = await supabase
        .from('agent_prompts')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      setAgent(data);
    } catch (e: any) {
      toast.error('Failed to load agent: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPerformanceStats = async () => {
    if (!agent) return;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .rpc('get_agent_performance_stats', {
          p_agent_prompt_id: agent.id,
          p_days: 7
        });

      if (error) throw error;
      if (data && data.length > 0) {
        setPerformanceStats(data[0]);
      }
    } catch (e: any) {
      console.error('Failed to load performance stats:', e);
    }
  };

  const handleSave = async () => {
    if (!agent) return;

    try {
      setSaving(true);
      const supabase = getSupabase();

      const updates = {
        ...editedAgent,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('agent_prompts')
        .update(updates)
        .eq('id', agent.id);

      if (error) throw error;

      toast.success('Agent configuration saved');
      setIsEditing(false);
      await loadAgent();
    } catch (e: any) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!agent) return;
    if (!window.confirm('Publish this agent configuration? It will be used in production.')) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('agent_prompts')
        .update({ status: 'published' })
        .eq('id', agent.id);

      if (error) throw error;
      toast.success('Agent published successfully');
      await loadAgent();
    } catch (e: any) {
      toast.error('Failed to publish: ' + e.message);
    }
  };

  const handleTestAgent = async () => {
    if (!agent || !testInput.trim()) {
      toast.error('Please enter test input');
      return;
    }

    try {
      setTestRunning(true);
      const supabase = getSupabase();

      const testData = {
        agent_prompt_id: agent.id,
        input: { test_text: testInput },
        model: agent.model,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data, error } = await supabase
        .from('agent_test_runs')
        .insert(testData)
        .select()
        .single();

      if (error) throw error;
      setTestOutput(data);
      toast.success('Test run completed');
    } catch (e: any) {
      toast.error('Test failed: ' + e.message);
    } finally {
      setTestRunning(false);
    }
  };

  const handleDuplicate = async () => {
    if (!agent) return;

    try {
      const supabase = getSupabase();
      const newAgent = {
        ...agent,
        id: undefined,
        agent_id: `${agent.agent_id}-copy`,
        title: `${agent.title} (Copy)`,
        status: 'draft',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('agent_prompts')
        .insert(newAgent)
        .select()
        .single();

      if (error) throw error;
      toast.success('Agent duplicated');
      navigate(`/admin/agents/${data.id}`);
    } catch (e: any) {
      toast.error('Failed to duplicate: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading agent configuration...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Agent Not Found</h2>
          <button
            onClick={() => navigate('/admin/swarms')}
            className="text-blue-600 hover:text-blue-700"
          >
            Return to Swarm Management
          </button>
        </div>
      </div>
    );
  }

  const startEditing = () => {
    setEditedAgent({ ...agent });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedAgent({});
    setIsEditing(false);
  };

  const updateField = (field: string, value: any) => {
    setEditedAgent(prev => ({ ...prev, [field]: value }));
  };

  const currentAgent = isEditing ? { ...agent, ...editedAgent } : agent;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/swarms')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Swarm Management
          </button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{agent.title}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    agent.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {agent.status}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  v{agent.version}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">ID:</span> {agent.agent_id} |
                <span className="font-medium ml-2">Type:</span> {agent.agent_type} |
                <span className="font-medium ml-2">Phase:</span> {agent.phase} |
                <span className="font-medium ml-2">Order:</span> {agent.exec_order}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={handleDuplicate}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </button>
                  {agent.status === 'draft' && (
                    <button
                      onClick={handlePublish}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Publish
                    </button>
                  )}
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Settings className="h-4 w-4" />
                    Edit Configuration
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={cancelEditing}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <div className="flex gap-8">
            {[
              { id: 'prompt', label: 'Prompt', icon: Settings },
              { id: 'config', label: 'Configuration', icon: Zap },
              { id: 'performance', label: 'Performance', icon: BarChart3 },
              { id: 'testing', label: 'Testing', icon: Play }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'prompt' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Prompt</h3>
              <textarea
                value={currentAgent.content}
                onChange={e => isEditing && updateField('content', e.target.value)}
                readOnly={!isEditing}
                rows={20}
                className={`w-full px-4 py-3 border rounded-lg font-mono text-sm ${
                  isEditing
                    ? 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                    : 'border-gray-200 bg-gray-50'
                }`}
                placeholder="Enter the system prompt for this agent..."
              />
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Prompt Best Practices</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Be clear and specific about the agent's task</li>
                  <li>• Specify the expected output format (JSON, text, etc.)</li>
                  <li>• Include examples for complex tasks</li>
                  <li>• Define edge case handling</li>
                  <li>• Keep prompts focused on a single responsibility</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <select
                    value={currentAgent.model}
                    onChange={e => isEditing && updateField('model', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                  >
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4o-realtime-preview">GPT-4o Realtime (Voice)</option>
                  </select>
                </div>

                {/* Agent Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Type
                  </label>
                  <select
                    value={currentAgent.agent_type}
                    onChange={e => isEditing && updateField('agent_type', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                  >
                    <option value="llm">LLM</option>
                    <option value="rule">Rule-based</option>
                    <option value="code">Code</option>
                    <option value="template">Template</option>
                    <option value="voice">Voice</option>
                  </select>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature: {currentAgent.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={currentAgent.temperature}
                    onChange={e => isEditing && updateField('temperature', parseFloat(e.target.value))}
                    disabled={!isEditing}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Focused (0)</span>
                    <span>Balanced (1)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="16000"
                    value={currentAgent.max_tokens}
                    onChange={e => isEditing && updateField('max_tokens', parseInt(e.target.value))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                  />
                </div>

                {/* Response Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Response Format
                  </label>
                  <select
                    value={currentAgent.response_format}
                    onChange={e => isEditing && updateField('response_format', e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                  >
                    <option value="text">Text</option>
                    <option value="json">JSON</option>
                    <option value="structured">Structured</option>
                  </select>
                </div>

                {/* Timeout */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    max="60000"
                    step="1000"
                    value={currentAgent.timeout_ms}
                    onChange={e => isEditing && updateField('timeout_ms', parseInt(e.target.value))}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                  />
                </div>
              </div>

              {/* Retry Configuration */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium text-gray-900 mb-4">Retry & Fallback</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentAgent.retry_enabled}
                      onChange={e => isEditing && updateField('retry_enabled', e.target.checked)}
                      disabled={!isEditing}
                      className="h-4 w-4"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Enable Retries
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Retries
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={currentAgent.max_retries}
                      onChange={e => isEditing && updateField('max_retries', parseInt(e.target.value))}
                      disabled={!isEditing || !currentAgent.retry_enabled}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fallback Behavior
                    </label>
                    <select
                      value={currentAgent.fallback_behavior}
                      onChange={e => isEditing && updateField('fallback_behavior', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                    >
                      <option value="error">Throw Error</option>
                      <option value="skip">Skip Agent</option>
                      <option value="default">Use Default</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={currentAgent.is_optional}
                      onChange={e => isEditing && updateField('is_optional', e.target.checked)}
                      disabled={!isEditing}
                      className="h-4 w-4"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Agent is Optional
                    </label>
                  </div>
                </div>
              </div>

              {/* Voice Configuration (if voice agent) */}
              {currentAgent.agent_type === 'voice' && (
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Voice Configuration</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice Provider
                      </label>
                      <select
                        value={currentAgent.voice_config?.provider || 'openai'}
                        onChange={e => isEditing && updateField('voice_config', {
                          ...currentAgent.voice_config,
                          provider: e.target.value
                        })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                      >
                        <option value="openai">OpenAI</option>
                        <option value="elevenlabs" disabled>ElevenLabs (Coming Soon)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Voice
                      </label>
                      <select
                        value={currentAgent.voice_config?.voice || 'alloy'}
                        onChange={e => isEditing && updateField('voice_config', {
                          ...currentAgent.voice_config,
                          voice: e.target.value
                        })}
                        disabled={!isEditing}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-50"
                      >
                        <option value="alloy">Alloy</option>
                        <option value="echo">Echo</option>
                        <option value="fable">Fable</option>
                        <option value="onyx">Onyx</option>
                        <option value="nova">Nova</option>
                        <option value="shimmer">Shimmer</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics (Last 7 Days)</h3>
              {performanceStats ? (
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Avg Latency</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{performanceStats.avg_latency_ms.toFixed(0)}ms</div>
                    <div className="text-xs text-blue-700 mt-1">P95: {performanceStats.p95_latency_ms.toFixed(0)}ms</div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Success Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{performanceStats.success_rate.toFixed(1)}%</div>
                    <div className="text-xs text-green-700 mt-1">{performanceStats.total_executions} executions</div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900">Total Cost</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-900">${(performanceStats.total_cost_cents / 100).toFixed(2)}</div>
                    <div className="text-xs text-yellow-700 mt-1">{performanceStats.total_tokens.toLocaleString()} tokens</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No performance data available yet</p>
                  <p className="text-sm mt-2">This agent hasn't been executed in the last 7 days</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Agent</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Input
                  </label>
                  <textarea
                    value={testInput}
                    onChange={e => setTestInput(e.target.value)}
                    rows={6}
                    placeholder="Enter test input for this agent..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleTestAgent}
                  disabled={testRunning || !testInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  <Play className="h-4 w-4" />
                  {testRunning ? 'Running Test...' : 'Run Test'}
                </button>

                {testOutput && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Test Output
                    </label>
                    <pre className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm overflow-auto max-h-96">
                      {JSON.stringify(testOutput, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
