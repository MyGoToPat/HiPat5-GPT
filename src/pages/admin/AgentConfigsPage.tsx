import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Edit2, Save, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';

interface AgentConfig {
  id: number;
  agent_key: string;
  config: any;
  updated_at: string;
}

interface ValidationResult {
  valid: boolean;
  violations: string[];
  isPersonalityAgent: boolean;
  checkedTerms: number;
}

export default function AgentConfigsPage() {
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<string>('');
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [validating, setValidating] = useState(false);

  const supabase = getSupabase();
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/swarm-admin-api`;

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(`${apiUrl}/agent-configs`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch configs');
      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
      toast.error('Failed to load agent configurations');
    } finally {
      setLoading(false);
    }
  };

  const validateAllConfigs = async () => {
    try {
      setValidating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const results: Record<string, ValidationResult> = {};

      for (const config of configs) {
        const response = await fetch(`${apiUrl}/agent-configs/validate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_key: config.agent_key,
            config: config.config,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          results[config.agent_key] = result;
        }
      }

      setValidationResults(results);
      toast.success('Validation complete');
    } catch (error) {
      console.error('Validation failed:', error);
      toast.error('Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleEdit = (config: AgentConfig) => {
    setEditingKey(config.agent_key);
    setEditingConfig(JSON.stringify(config.config, null, 2));
  };

  const handleSave = async (agentKey: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const parsedConfig = JSON.parse(editingConfig);

      const response = await fetch(`${apiUrl}/agent-configs/${agentKey}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: parsedConfig }),
      });

      if (!response.ok) throw new Error('Failed to save config');

      toast.success('Configuration saved');
      setEditingKey(null);
      fetchConfigs();
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save configuration');
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditingConfig('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Configurations</h1>
            <p className="text-gray-600 mt-2">View and validate Pat's personality and swarm agents</p>
          </div>
          <button
            onClick={validateAllConfigs}
            disabled={validating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {validating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Validate All
              </>
            )}
          </button>
        </div>

        {Object.keys(validationResults).length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Validation Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-sm">
                <span className="font-medium">Total Configs:</span> {configs.length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Valid:</span>{' '}
                {Object.values(validationResults).filter(r => r.valid).length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Issues:</span>{' '}
                {Object.values(validationResults).filter(r => !r.valid).length}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {configs.map((config) => {
            const validation = validationResults[config.agent_key];
            const isEditing = editingKey === config.agent_key;

            return (
              <div
                key={config.agent_key}
                className={`bg-white rounded-lg shadow-md p-6 border-2 ${
                  validation?.isPersonalityAgent && !validation?.valid
                    ? 'border-red-300'
                    : validation?.isPersonalityAgent
                    ? 'border-green-300'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{config.agent_key}</h3>
                      {validation?.isPersonalityAgent && (
                        <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded">
                          PERSONALITY
                        </span>
                      )}
                      {validation && (
                        validation.valid ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Last updated: {new Date(config.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSave(config.agent_key)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Save className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEdit(config)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {validation && !validation.valid && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <h4 className="font-semibold text-red-900 text-sm mb-2">Validation Issues:</h4>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                      {validation.violations.map((violation, idx) => (
                        <li key={idx}>{violation}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {isEditing ? (
                  <textarea
                    value={editingConfig}
                    onChange={(e) => setEditingConfig(e.target.value)}
                    className="w-full h-96 p-4 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border border-gray-200">
                    <code>{JSON.stringify(config.config, null, 2)}</code>
                  </pre>
                )}
              </div>
            );
          })}
        </div>

        {configs.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No agent configurations found</p>
          </div>
        )}
      </div>
    </div>
  );
}
