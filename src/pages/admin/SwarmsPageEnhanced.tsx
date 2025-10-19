import React, { useState, useEffect } from 'react';
import { useSwarmsStore } from '../../store/swarms';
import { useSwarmsEnhancedStore } from '../../store/swarmsEnhanced';
import { Settings, ChevronRight, Edit2, Save, X, ChevronDown, Play, Plus, Activity, CheckCircle, XCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { TestRunnerModal } from '../../components/admin/TestRunnerModal';
import { getFeatureFlags } from '../../lib/featureFlags';
import { getSupabase } from '../../lib/supabase';

// READ-ONLY MODE: Phase C enforcement
const ADMIN_ENHANCED_WRITE_ENABLED = false; // Hardcoded to false per Phase C requirements

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

  const { healthCheck } = useSwarmsEnhancedStore();

  const [selectedSwarm, setSelectedSwarm] = useState<any>(null);
  const [activeVersion, setActiveVersion] = useState<any>(null);
  const [editingManifest, setEditingManifest] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [rolloutValue, setRolloutValue] = useState(0);
  const [testRunnerOpen, setTestRunnerOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ checking: boolean; status: 'ok' | 'error' | null; message?: string }>({ checking: false, status: null });
  const [manifestError, setManifestError] = useState<string>('');
  const [cohortValue, setCohortValue] = useState<'beta' | 'paid' | 'all'>('beta');
  const [adminFlags, setAdminFlags] = useState<{ adminSwarmsEnhanced: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasAccess(false);
        return;
      }
      const flags = await getFeatureFlags(user.id);
      setHasAccess(flags.swarmsV2Admin);
      setAdminFlags({ adminSwarmsEnhanced: flags.adminSwarmsEnhanced });
      if (flags.swarmsV2Admin) {
        fetchSwarms();
      }
    })();
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

    setManifestError('');

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
      const errorMsg = 'Invalid JSON: ' + e.message;
      setManifestError(errorMsg);
      toast.error(errorMsg);
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

  const handleHealthCheck = async () => {
    setHealthStatus({ checking: true, status: null });
    try {
      const result = await healthCheck();
      if (result.status === 'ok' && result.canReadSwarms) {
        setHealthStatus({ checking: false, status: 'ok', message: 'API is healthy' });
        toast.success('API Health: OK');
      } else {
        setHealthStatus({ checking: false, status: 'error', message: 'API cannot read swarms' });
        toast.error('API Health: Error');
      }
    } catch (e: any) {
      setHealthStatus({ checking: false, status: 'error', message: e.message });
      toast.error('API Health Check Failed: ' + e.message);
    }
  };

  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Checking access...</div>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">This feature is only available to administrators.</p>
        </div>
      </div>
    );
  }

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
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Swarm Management (Enhanced)</h1>
              <p className="mt-2 text-gray-600">
                Configure swarm manifests, agent ordering by phase, and rollout controls.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                  ⚠️ All features are behind flags. Rollout defaults to 0% (no user impact).
                </div>
                {/* Debug Pill - Phase C */}
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                  <Lock className="h-3 w-3 text-gray-600" />
                  <span className="text-gray-700">
                    <strong>Debug:</strong> adminSwarmsEnhanced={adminFlags?.adminSwarmsEnhanced ? 'true' : 'false'} |
                    WRITE_ENABLED={ADMIN_ENHANCED_WRITE_ENABLED ? 'true' : 'false'} |
                    dataSource=edge-function
                  </span>
                </div>
              </div>
              {!ADMIN_ENHANCED_WRITE_ENABLED && (
                <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-3">
                  <Lock className="h-4 w-4" />
                  <span>
                    <strong>Read-Only Mode:</strong> All write controls are disabled in this environment. Data is fetched via Edge Function (swarm-admin-api).
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleHealthCheck}
                disabled={healthStatus.checking}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
              >
                {healthStatus.checking ? (
                  <>
                    <Activity className="h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : healthStatus.status === 'ok' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    API: OK
                  </>
                ) : healthStatus.status === 'error' ? (
                  <>
                    <XCircle className="h-4 w-4" />
                    API: Error
                  </>
                ) : (
                  <>
                    <Activity className="h-4 w-4" />
                    Check API Health
                  </>
                )}
              </button>
            </div>
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
                  swarms.map((swarm: any) => (
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
                    <div className="relative group">
                      <button
                        onClick={() => !ADMIN_ENHANCED_WRITE_ENABLED && setTestRunnerOpen(true)}
                        disabled={!ADMIN_ENHANCED_WRITE_ENABLED}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                        title={!ADMIN_ENHANCED_WRITE_ENABLED ? "Writes disabled in this environment" : ""}
                      >
                        <Play className="h-4 w-4" />
                        Test Runner
                      </button>
                      {!ADMIN_ENHANCED_WRITE_ENABLED && (
                        <div className="hidden group-hover:block absolute top-full mt-1 right-0 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                          Writes disabled in this environment
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Manifest Configuration</h3>
                    {!isEditing ? (
                      <div className="relative group">
                        <button
                          onClick={() => ADMIN_ENHANCED_WRITE_ENABLED && setIsEditing(true)}
                          disabled={!ADMIN_ENHANCED_WRITE_ENABLED}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          <Edit2 className="h-4 w-4" />
                          Create Draft
                        </button>
                        {!ADMIN_ENHANCED_WRITE_ENABLED && (
                          <div className="hidden group-hover:block absolute top-full mt-1 right-0 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                            Writes disabled in this environment
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setManifestError('');
                            if (activeVersion) {
                              setEditingManifest(JSON.stringify(activeVersion.manifest, null, 2));
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                        <div className="relative group">
                          <button
                            onClick={() => ADMIN_ENHANCED_WRITE_ENABLED && handleSaveManifest()}
                            disabled={!ADMIN_ENHANCED_WRITE_ENABLED}
                            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            <Save className="h-4 w-4" />
                            Save Draft
                          </button>
                          {!ADMIN_ENHANCED_WRITE_ENABLED && (
                            <div className="hidden group-hover:block absolute top-full mt-1 right-0 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                              Writes disabled in this environment
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {activeVersion ? (
                    <div>
                      {isEditing ? (
                        <div>
                          <textarea
                            value={editingManifest}
                            onChange={(e) => {
                              if (ADMIN_ENHANCED_WRITE_ENABLED) {
                                setEditingManifest(e.target.value);
                                setManifestError('');
                              }
                            }}
                            readOnly={!ADMIN_ENHANCED_WRITE_ENABLED}
                            className={`w-full h-96 px-4 py-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              manifestError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            } ${!ADMIN_ENHANCED_WRITE_ENABLED ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                            spellCheck={false}
                            placeholder='{"phases": ["pre", "core", "filter", "presenter", "render"], "agents": []}'
                          />
                          {manifestError && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                              {manifestError}
                            </div>
                          )}
                        </div>
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
                      <div className="relative group inline-block mt-4">
                        <button
                          onClick={() => {
                            if (ADMIN_ENHANCED_WRITE_ENABLED) {
                              setIsEditing(true);
                              setEditingManifest('{\n  "phases": ["pre", "core", "filter", "presenter", "render"],\n  "agents": [],\n  "protected_fields": ["totals.kcal", "totals.protein_g", "totals.carbs_g", "totals.fat_g"]\n}');
                            }
                          }}
                          disabled={!ADMIN_ENHANCED_WRITE_ENABLED}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Create First Version
                        </button>
                        {!ADMIN_ENHANCED_WRITE_ENABLED && (
                          <div className="hidden group-hover:block absolute top-full mt-1 left-1/2 transform -translate-x-1/2 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                            Writes disabled in this environment
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Versions & Rollout</h3>

                  {swarmVersions.length === 0 ? (
                    <p className="text-sm text-gray-500">No versions created yet</p>
                  ) : (
                    <div className="space-y-3">
                      {swarmVersions.map((version: any) => (
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
                              <div className="relative group">
                                <button
                                  onClick={() => ADMIN_ENHANCED_WRITE_ENABLED && handlePublish(version.id)}
                                  disabled={!ADMIN_ENHANCED_WRITE_ENABLED}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                  Publish @ 0%
                                </button>
                                {!ADMIN_ENHANCED_WRITE_ENABLED && (
                                  <div className="hidden group-hover:block absolute top-full mt-1 right-0 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                                    Writes disabled in this environment
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {version.status === 'published' && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Rollout Percentage: {version.rollout_percent}%
                              </label>
                              <div className="flex items-center gap-3 mb-3">
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={rolloutValue}
                                  onChange={(e) => ADMIN_ENHANCED_WRITE_ENABLED && setRolloutValue(Number(e.target.value))}
                                  disabled={!ADMIN_ENHANCED_WRITE_ENABLED}
                                  className="flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <div className="relative group">
                                  <button
                                    onClick={() => ADMIN_ENHANCED_WRITE_ENABLED && handleRolloutChange(version.id, rolloutValue)}
                                    disabled={!ADMIN_ENHANCED_WRITE_ENABLED}
                                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                  >
                                    Update
                                  </button>
                                  {!ADMIN_ENHANCED_WRITE_ENABLED && (
                                    <div className="hidden group-hover:block absolute top-full mt-1 right-0 z-10 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                                      Writes disabled in this environment
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mb-3">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Cohort Targeting
                                </label>
                                <select
                                  value={cohortValue}
                                  onChange={(e) => ADMIN_ENHANCED_WRITE_ENABLED && setCohortValue(e.target.value as any)}
                                  disabled={!ADMIN_ENHANCED_WRITE_ENABLED}
                                  className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                  <option value="beta">Beta Users</option>
                                  <option value="paid">Paid Users</option>
                                  <option value="all">All Users</option>
                                </select>
                              </div>
                              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
                                Active rollout: {version.rollout_percent}% to {cohortValue} cohort
                              </div>
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
