import React, { useEffect, useState } from 'react';
import { useAgentsStore } from '../../store/agents';
import { Link } from 'react-router-dom';
import { Plus, Edit, Eye, Settings } from 'lucide-react';
import { AgentCreateModal } from '../../components/agents/AgentCreateModal';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

export default function AgentsListPage() {
  const { user, isAdmin } = useAuth();
  const { agents, loading, error, fetchAgents, createAgent } = useAgentsStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewAllAgents, setViewAllAgents] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAgents(viewAllAgents, user.id);
    }
  }, [user?.id, viewAllAgents, fetchAgents]);

  const handleCreateAgent = async (name: string) => {
    if (!user?.id) {
      toast.error("User not authenticated.");
      return;
    }
    const newAgent = await createAgent(name, user.id);
    if (newAgent) {
      toast.success(`Agent "${newAgent.name}" created!`);
      setShowCreateModal(false);
    } else {
      toast.error("Failed to create agent.");
    }
  };

  if (loading) return <div className="p-6 text-center">Loading agents...</div>;
  if (error) return <div className="p-6 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={viewAllAgents}
                onChange={(e) => setViewAllAgents(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              View All Agents
            </label>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Create Agent
          </button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <Settings size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-lg text-gray-700">No agents found.</p>
          <p className="text-gray-500">Create your first agent to get started!</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map((agent) => {
                const currentVersion = useAgentsStore.getState().getCurrentAgentVersion(agent.id);
                return (
                  <tr key={agent.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{agent.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{agent.created_by}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {currentVersion ? `Version ${currentVersion.version}` : 'None'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(agent.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        to={`/admin/agents/${agent.id}`} 
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Edit size={16} /> Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AgentCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateAgent}
      />
    </div>
  );
}