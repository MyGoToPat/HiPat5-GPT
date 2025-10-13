import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface RoleAccess {
  id: string;
  role_name: string;
  stage: 'admin' | 'beta' | 'public';
  enabled: boolean;
  updated_at: string;
}

export default function RoleAccessPage() {
  const [roles, setRoles] = useState<RoleAccess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      const { data, error } = await supabase
        .from('role_access')
        .select('*')
        .order('role_name');

      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error('Error loading roles:', err);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  }

  async function updateStage(id: string, stage: 'admin' | 'beta' | 'public') {
    try {
      const { error } = await supabase
        .from('role_access')
        .update({ stage, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setRoles(prev => prev.map(r => r.id === id ? { ...r, stage, updated_at: new Date().toISOString() } : r));
      toast.success('Stage updated');
    } catch (err) {
      console.error('Error updating stage:', err);
      toast.error('Failed to update stage');
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    try {
      const { error } = await supabase
        .from('role_access')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setRoles(prev => prev.map(r => r.id === id ? { ...r, enabled, updated_at: new Date().toISOString() } : r));
      toast.success(enabled ? 'Role enabled' : 'Role disabled');
    } catch (err) {
      console.error('Error toggling enabled:', err);
      toast.error('Failed to toggle role');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Role Access Control</h1>
        <p className="text-gray-600">
          Manage role availability across admin, beta, and public tiers.
          <span className="font-semibold ml-1">Personality is always enabled</span> (not gated).
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enabled
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {role.role_name.toUpperCase()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={role.stage}
                    onChange={(e) => updateStage(role.id, e.target.value as 'admin' | 'beta' | 'public')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="beta">Beta</option>
                    <option value="public">Public</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleEnabled(role.id, !role.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      role.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        role.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(role.updated_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {roles.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No roles configured yet
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Stage Definitions</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong>Admin:</strong> Only admin users can access this role</li>
          <li><strong>Beta:</strong> Admin and beta users can access this role</li>
          <li><strong>Public:</strong> All users can access this role</li>
        </ul>
      </div>
    </div>
  );
}
