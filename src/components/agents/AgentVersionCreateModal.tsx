import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface AgentVersionCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: Record<string, any>) => void;
}

export const AgentVersionCreateModal: React.FC<AgentVersionCreateModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [configJson, setConfigJson] = useState(`{
  "name": "Example Agent",
  "description": "An example AI agent configuration",
  "model": "gpt-4",
  "temperature": 0.7,
  "systemPrompt": "You are a helpful AI assistant."
}`);
  const [configError, setConfigError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigError(null);
    
    try {
      const config = JSON.parse(configJson);
      onCreate(config);
      setConfigJson(`{
  "name": "Example Agent",
  "description": "An example AI agent configuration",
  "model": "gpt-4",
  "temperature": 0.7,
  "systemPrompt": "You are a helpful AI assistant."
}`);
    } catch (e: any) {
      setConfigError("Invalid JSON format. Please check your configuration.");
    }
  };

  const handleConfigChange = (value: string) => {
    setConfigJson(value);
    setConfigError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Create New Agent Version</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="configJson" className="block text-sm font-medium text-gray-700 mb-2">
              Version Configuration (JSON)
            </label>
            <textarea
              id="configJson"
              value={configJson}
              onChange={(e) => handleConfigChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={12}
              placeholder="Enter JSON configuration..."
              required
            />
            {configError && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <X size={16} /> {configError}
              </p>
            )}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Configuration Help</h3>
            <p className="text-blue-800 text-sm">
              The configuration should be valid JSON. Common fields include: name, description, model, temperature, systemPrompt, tools, etc.
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!configError || !configJson.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} /> Create Version
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};