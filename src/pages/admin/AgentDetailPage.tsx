import React, { useEffect, useState } from 'react';
import AdminHeader from '../../components/admin/AdminHeader';
import { useParams, Link } from 'react-router-dom';
import { useAgentsStore } from '../../store/agents';
import { Plus, CheckCircle, Trash2, Settings, ArrowLeft } from 'lucide-react';
import { AgentVersionCreateModal } from '../../components/agents/AgentVersionCreateModal';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const {
    getAgentById,
    getAgentVersions,
    fetchAgentVersions,
    createAgentVersion,
    updateAgentCurrentVersion,
    deleteAgentVersion,
    loading,
    error
  } = useAgentsStore();

  const agent = agentId ? getAgentById(agentId) : undefined;
  const versions = agentId ? getAgentVersions(agentId) : [];
  const [showCreateVersionModal, setShowCreateVersionModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [savingProvider, setSavingProvider] = useState(false);

  useEffect(() => {
    if (agentId) {
      fetchAgentVersions(agentId);
    }
  }, [agentId, fetchAgentVersions]);

  const currentVersion = useAgentsStore.getState().getCurrentAgentVersion(agent?.id || '');
  
  // Update selectedProvider when current version changes
  useEffect(() => {
    if (currentVersion) {
      const provider = currentVersion.config?.provider || 'openai';
      setSelectedProvider(provider);
    }
  }, [currentVersion]);

  const handleSaveProvider = async () => {
    if (!agentId || !currentVersion) return;
    
    setSavingProvider(true);
    try {
      const supabase = getSupabase();
      const cfg = currentVersion.config || {};
      const next = { ...cfg, provider: selectedProvider || 'openai' };
      
      const { error } = await supabase
        .from('agent_versions')
        .update({ config: next })
        .eq('id', currentVersion.id);
      
      if (error) throw error;
      
      toast.success(`Provider updated to ${selectedProvider}`);
      // Refresh versions to show updated config
      await fetchAgentVersions(agentId);
    } catch (error) {
      console.error('Error updating provider:', error);
      toast.error('Failed to update provider');
    } finally {
      setSavingProvider(false);
    }
  };

  const handleCreateVersion = async (config: Record<string, any>) => {
    if (!agentId) return;
    const newVersion = await createAgentVersion(agentId, config);
    if (newVersion) {
      toast.success(`Version ${newVersion.version} created and set as current!`);
      setShowCreateVersionModal(false);
    } else {
      toast.error("Failed to create agent version.");
    }
  };

  const handleSetCurrentVersion = async (versionId: string, versionNumber: number) => {
    if (!agentId) return;
    await updateAgentCurrentVersion(agentId, versionId);
    toast.success(`Agent updated to version ${versionNumber}`);
  };

  const handleDeleteVersion = async (versionId: string, versionNumber: number) => {
    if (window.confirm(`Are you sure you want to delete version ${versionNumber}?`)) {
      await deleteAgentVersion(versionId);
      toast.success(`Version ${versionNumber} deleted.`);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading agent details...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!agent) return <div className="p-6 text-center">Agent not found.</div>;

  const availableProviders = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'gemini', label: 'Google Gemini' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'perplexity', label: 'Perplexity' }
  ];

  return (
    <div className="p-6">
      <AdminHeader
        title={agent ? `Agent: ${agent.name}` : 'Agent'}
        subtitle={agent ? `slug: ${agent.id}` : ''}
        right={
          <div className="flex items-center gap-2">
            <Link to={`/chat?agent=${agent?.id ?? ''}`} className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200">
              Test in Chat
            </Link>
          </div>
        }
      />

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Agent Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-gray-700"><strong>ID:</strong> {agent.id}</p>
            <p className="text-gray-700"><strong>Name:</strong> {agent.name}</p>
          </div>
          <div>
            <p className="text-gray-700"><strong>Created By:</strong> {agent.created_by}</p>
            <p className="text-gray-700"><strong>Created At:</strong> {new Date(agent.created_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            <strong>Current Version:</strong>{' '}
            {currentVersion ? (
              `Version ${currentVersion.version} (${new Date(currentVersion.created_at).toLocaleDateString()})`
            ) : (
              'None - Create the first version below'
            )}
          </p>
        </div>
      </div>

      {/* LLM Provider Configuration */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">LLM Provider Configuration</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label htmlFor="provider-select" className="block text-sm font-medium text-gray-700 mb-2">
              LLM Provider
            </label>
            <select
              id="provider-select"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableProviders.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-shrink-0">
            <button
              onClick={handleSaveProvider}
              disabled={savingProvider || !currentVersion}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {savingProvider ? 'Saving...' : 'Save Provider'}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Current provider: <span className="font-medium">{currentVersion?.config?.provider || 'openai'}</span>
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Versions</h2>
        <button
          onClick={() => setShowCreateVersionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> Create New Version
        </button>
      </div>

      {versions.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <Settings size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-700">No versions found for this agent.</p>
          <p className="text-gray-500">Create the first version to get started!</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Configuration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {versions.map((version) => {
                const isCurrent = agent.current_version_id === version.id;
                return (
                  <tr key={version.id} className={isCurrent ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Version {version.version}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-24 max-w-xs">
                        {JSON.stringify(version.config, null, 2)}
                      </pre>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(version.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} /> Current
                        </span>
                      ) : (
                        <span className="text-gray-500">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {!isCurrent && (
                          <button
                            onClick={() => handleSetCurrentVersion(version.id, version.version)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Set Current
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteVersion(version.id, version.version)}
                          className="text-red-600 hover:text-red-900 flex items-center gap-1"
                          disabled={isCurrent}
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AgentVersionCreateModal
        isOpen={showCreateVersionModal}
        onClose={() => setShowCreateVersionModal(false)}
        onCreate={handleCreateVersion}
      />
    </div>
  );
}