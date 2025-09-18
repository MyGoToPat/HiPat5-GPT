import React, { useState } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { getPersonalityAgents } from '../../../state/personalityStore';
import type { AgentConfig } from '../../../types/mcp';

interface AddSwarmAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: string;
  onAddAgents: (agentIds: string[], roleName: string) => void;
}

export const AddSwarmAgentModal: React.FC<AddSwarmAgentModalProps> = ({ 
  isOpen, 
  onClose, 
  currentRole,
  onAddAgents 
}) => {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Get all available agents from personality store
  const allAgents = getPersonalityAgents();
  const agentsList = Object.values(allAgents);

  // Filter agents based on search query
  const filteredAgents = agentsList.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAgents.length === filteredAgents.length) {
      setSelectedAgents([]);
    } else {
      setSelectedAgents(filteredAgents.map(agent => agent.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedAgents.length === 0) {
      return;
    }

    onAddAgents(selectedAgents, currentRole);
    setSelectedAgents([]);
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setSelectedAgents([]);
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add Agents to {currentRole}</h2>
              <p className="text-gray-600 text-sm mt-1">
                Select agents to assign to this role
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Select All */}
          <div className="mb-4 flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedAgents.length === filteredAgents.length && filteredAgents.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select All ({filteredAgents.length} agents)
              </span>
            </label>
            <span className="text-sm text-gray-500">
              {selectedAgents.length} selected
            </span>
          </div>

          {/* Agent List */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
            {filteredAgents.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No agents found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredAgents.map((agent) => (
                  <label
                    key={agent.id}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.id)}
                      onChange={() => handleAgentToggle(agent.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-600">{agent.id}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Phase: {agent.phase} • Order: {agent.order}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {agent.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Selected: {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedAgents.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              Add {selectedAgents.length} Agent{selectedAgents.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};