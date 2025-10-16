import React, { useState, useEffect } from 'react';
import { useSwarmsStore } from '../../store/swarms';
import { Settings, ChevronRight, Edit2, Save, X, ChevronDown, Play, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { TestRunnerModal } from '../../components/admin/TestRunnerModal';

export default function SwarmsPageEnhanced() {
  const {
    swarms,
    swarmVersions,
    fetchSwarms,
    fetchSwarmVersions,
    createSwarmVersion,
    publishSwarmVersion,
    updateRolloutPercent,
    loading
  } = useSwarmsStore();

  const [selectedSwarm, setSelectedSwarm] = useState<any>(null);
  const [activeVersion, setActiveVersion] = useState<any>(null);
  const [editingManifest, setEditingManifest] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [rolloutValue, setRolloutValue] = useState(0);
  const [testRunnerOpen, setTestRunnerOpen] = useState(false);

  useEffect(() => {
    fetchSwarms();
  }, [fetchSwarms]);

  useEffect(() => {
    if (selectedSwarm) {
      fetchSwarmVersions(selectedSwarm.id);
    }
  }, [selectedSwarm, fetchSwarmVersions]);

  useEffect(() => {
    const published = swarmVersions.find(v => v.status === 'published');
    if (published) {
      setActiveVersion(published);
      setEditingManifest(JSON.stringify(published.manifest, null, 2));
      setRolloutValue(published.rollout_percent);
    }
  }, [swarmVersions]);

  const handleSaveManifest = async () => {
    if (!selectedSwarm) return;

    try {
      const manifest = JSON.parse(editingManifest);

      const newVersion = await createSwarmVersion({
        swarm_id: selectedSwarm.id,
        manifest,
        status: 'draft',
        rollout_percent: 0
      });

      if (newVersion) {
        toast.success('Draft version created');
        setIsEditing(false);
        await fetchSwarmVersions(selectedSwarm.id);
      }
    } catch (e: any) {
      toast.error('Invalid JSON: ' + e.message);
    }
  };

  const handlePublish = async (versionId: string) => {
    if (!window.confirm('Publish this version? It will be set to 0% rollout.')) return;

    try {
      await publishSwarmVersion(versionId);
      toast.success('Version published at 0% rollout');
      await fetchSwarmVersions(selectedSwarm.id);
    } catch (e: any) {
      toast.error('Publish failed: ' + e.message);
    }
  };

  const handleRolloutChange = async (versionId: string, percent: number) => {
    try {
      await updateRolloutPercent(versionId, percent);
      setRolloutValue(percent);
      toast.success(`Rollout updated to ${percent}%`);
    } catch (e: any) {
      toast.error('Rollout update failed: ' + e.message);
    }
  };

  if (loading && !swarms.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading swarms...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Swarm Management (P1)</h1>
          <p className="mt-2 text-gray-600">
            Configure swarm manifests, agent ordering by phase, and rollout controls.
          </p>
          <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
            ⚠️ All features are behind flags. Rollout defaults to 0% (no user impact).
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Swarms</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select a swarm to view and edit its configuration
                </p>
              </div>

              <div className="divide-y divide-gray-200">
                {swarms.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>No swarms configured</p>
                    <p className="text-xs mt-2">Run migration to create swarms table</p>
                  </div>
                ) : (
                  swarms.map((swarm) => (
                    <button
                      key={swarm.id}
                      onClick={() => setSelectedSwarm(swarm)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedSwarm?.id === swarm.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{swarm.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{swarm.id}</p>
                          {swarm.description && (
                            <p className="text-xs text-gray-600 mt-1">{swarm.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                swarm.enabled
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {swarm.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight
                          size={20}
                          className={`text-gray-400 mt-1 ${
                            selectedSwarm?.id === swarm.id ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedSwarm ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedSwarm.name}</h2>
                      <p className="text-sm text-gray-600 mt-1">{selectedSwarm.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-xs text-gray-500">
                          <span className="font-medium">ID:</span> {selectedSwarm.id}
                        </span>
                        <span className="text-xs text-gray-500">
                          <span className="font-medium">Model:</span>{' '}
                          {selectedSwarm.default_model || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setTestRunnerOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      <Play className="h-4 w-4" />
                      Test Runner
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Manifest Configuration</h3>
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        <Edit2 className="h-4 w-4" />
                        Create Draft
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            if (activeVersion) {
                              setEditingManifest(JSON.stringify(activeVersion.manifest, null, 2));
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveManifest}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          <Save className="h-4 w-4" />
                          Save Draft
                        </button>
                      </div>
                    )}
                  </div>

                  {activeVersion ? (
                    <div>
                      {isEditing ? (
                        <textarea
                          value={editingManifest}
                          onChange={(e) => setEditingManifest(e.target.value)}
                          className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          spellCheck={false}
                        />
                      ) : (
                        <pre className="w-full h-96 overflow-auto px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm">
                          {editingManifest}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Settings className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No published version available</p>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Create First Version
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Versions & Rollout</h3>

                  {swarmVersions.length === 0 ? (
                    <p className="text-sm text-gray-500">No versions created yet</p>
                  ) : (
                    <div className="space-y-3">
                      {swarmVersions.map((version) => (
                        <div
                          key={version.id}
                          className={`border rounded-lg p-4 ${
                            version.status === 'published'
                              ? 'border-green-300 bg-green-50'
                              : version.status === 'draft'
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-gray-300 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  Version {new Date(version.created_at).toLocaleDateString()}
                                </span>
                                <span
                                  className={`text-xs px-2 py-1 rounded ${
                                    version.status === 'published'
                                      ? 'bg-green-200 text-green-800'
                                      : version.status === 'draft'
                                      ? 'bg-blue-200 text-blue-800'
                                      : 'bg-gray-200 text-gray-800'
                                  }`}
                                >
                                  {version.status}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Created: {new Date(version.created_at).toLocaleString()}
                              </p>
                              {version.published_at && (
                                <p className="text-xs text-gray-600">
                                  Published: {new Date(version.published_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                            {version.status === 'draft' && (
                              <button
                                onClick={() => handlePublish(version.id)}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                              >
                                Publish @ 0%
                              </button>
                            )}
                          </div>

                          {version.status === 'published' && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rollout Percentage: {version.rollout_percent}%
                              </label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={rolloutValue}
                                  onChange={(e) => setRolloutValue(Number(e.target.value))}
                                  className="flex-1"
                                />
                                <button
                                  onClick={() => handleRolloutChange(version.id, rolloutValue)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Update
                                </button>
                              </div>
                              <p className="text-xs text-gray-600 mt-2">
                                Current: {version.rollout_percent}% → New: {rolloutValue}%
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg text-gray-700">Select a swarm to view configuration</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <TestRunnerModal
        isOpen={testRunnerOpen}
        onClose={() => setTestRunnerOpen(false)}
        swarmId={selectedSwarm?.id}
      />
    </div>
  );
}
