import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

// Legacy import removed
const addSwarmTab = () => {};

interface NewRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleCreated: () => void;
}

export const NewRoleModal: React.FC<NewRoleModalProps> = ({ isOpen, onClose, onRoleCreated }) => {
  const [roleName, setRoleName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!roleName.trim()) {
      setError('Please enter a role name');
      return;
    }

    if (roleName.trim().length < 3) {
      setError('Role name must be at least 3 characters');
      return;
    }

    // Create the role ID from the name
    const roleId = roleName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Add to swarm tabs
    addSwarmTab({
      id: roleId,
      label: roleName.trim(),
      blurb: `Custom role: ${roleName.trim()}`
    });
    
    toast.success(`Role "${roleName.trim()}" created successfully!`);
    
    // Reset form and close
    setRoleName('');
    setError('');
    onRoleCreated();
    onClose();
  };

  const handleClose = () => {
    setRoleName('');
    setError('');
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
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create New Role</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
          <p className="text-gray-600 text-sm mt-1">
            Create a new role to organize agents and control access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 mb-2">
              Role Name
            </label>
            <input
              type="text"
              id="roleName"
              value={roleName}
              onChange={(e) => {
                setRoleName(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Advanced Nutrition Coach"
              required
              autoFocus
            />
            {error && (
              <p className="text-red-600 text-sm mt-1">{error}</p>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Role will appear in the role tabs filter</li>
              <li>• You can assign agents to this role</li>
              <li>• Configure per-role access settings</li>
              <li>• Changes are stored locally (no database yet)</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!roleName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              Create Role
            </button>
          </div>
        </form>
      </div>
    </>
  );
};