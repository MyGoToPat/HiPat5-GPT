import { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { getRoleAccessList, updateRoleAccess, type RoleAccessRecord } from '../../lib/roleAccess';
import toast from 'react-hot-toast';

export function FeatureToggles() {
  const [features, setFeatures] = useState<RoleAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadFeatures = async () => {
    setLoading(true);
    const data = await getRoleAccessList();
    setFeatures(data);
    setLoading(false);
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const handleToggle = async (roleName: string, currentEnabled: boolean) => {
    setUpdating(roleName);
    try {
      const feature = features.find(f => f.role_name === roleName);
      if (!feature) return;

      await updateRoleAccess(roleName, feature.stage, !currentEnabled);
      toast.success(`${roleName} ${!currentEnabled ? 'enabled' : 'disabled'}`);
      await loadFeatures();
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  const handleStageChange = async (roleName: string, newStage: 'admin' | 'beta' | 'public') => {
    setUpdating(roleName);
    try {
      const feature = features.find(f => f.role_name === roleName);
      if (!feature) return;

      await updateRoleAccess(roleName, newStage, feature.enabled);
      toast.success(`${roleName} moved to ${newStage}`);
      await loadFeatures();
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex items-center justify-between">
        <h2 className="text-xl font-semibold">Feature Toggles</h2>
        <button
          onClick={loadFeatures}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="divide-y">
        {features.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No features configured</div>
        ) : (
          features.map(feature => (
            <div key={feature.role_name} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{feature.role_name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Stage:</label>
                      <select
                        value={feature.stage}
                        onChange={(e) => handleStageChange(feature.role_name, e.target.value as any)}
                        disabled={updating === feature.role_name}
                        className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="admin">Admin Only</option>
                        <option value="beta">Beta Users</option>
                        <option value="public">Public</option>
                      </select>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      feature.stage === 'public' ? 'bg-green-100 text-green-700' :
                      feature.stage === 'beta' ? 'bg-blue-100 text-blue-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {feature.stage.toUpperCase()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggle(feature.role_name, feature.enabled)}
                  disabled={updating === feature.role_name}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    feature.enabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {feature.enabled ? (
                    <>
                      <ToggleRight className="w-5 h-5" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5" />
                      Disabled
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
