import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../../lib/supabase';
import { Search, Filter, ChevronLeft, ChevronRight, UserCheck, UserX, Crown, User, Building, Clock, CheckCircle, XCircle, AlertTriangle, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminHeader from '../../components/admin/AdminHeader';
import { useRole } from '../../hooks/useRole';
import { getRoleDisplayName } from '../../config/rbac';

export type AppRole = 'admin' | 'trainer' | 'user' | 'free_user' | 'paid_user';
export const APP_ROLES: AppRole[] = ['admin','trainer','user'];
export const APP_ROLE_LABELS: Record<AppRole,string> = {
  admin: 'Admin',
  trainer: 'Trainer',
  user: 'User',
};
const BETA_ALLOWED: AppRole[] = ['trainer'];

const getRoleChip = (role: AppRole) => {
  const colors = { admin: 'bg-red-100 text-red-800 border-red-200', trainer: 'bg-blue-100 text-blue-800 border-blue-200', paid_user: 'bg-green-100 text-green-800 border-green-200', free_user: 'bg-gray-100 text-gray-800 border-gray-200', user: 'bg-gray-100 text-gray-800 border-gray-200' };
  const icons = { admin: Crown, trainer: UserCheck, paid_user: CheckCircle, free_user: User, user: User };
  const IconComponent = icons[role];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${colors[role] || colors.free_user}`}>
      <IconComponent size={12} />
      {getRoleDisplayName(role)}
    </span>
  );
};

const EditUserModal = ({
  supabase,
  editingUser,
  setEditingUser,
  showEditModal,
  setShowEditModal,
  fetchUsers,
  setSaveError,
}: {
  supabase: ReturnType<typeof getSupabase>;
  editingUser: any;
  setEditingUser: (u: any) => void;
  showEditModal: boolean;
  setShowEditModal: (v: boolean) => void;
  fetchUsers: (page?: number) => void;
  setSaveError: (error: string | null) => void;
}) => {
  if (!showEditModal || !editingUser) return null;

  const handleChangeRole = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRole = e.target.value as AppRole;
    setEditingUser(prev => ({
      ...prev,
      role: nextRole,
      beta_user: BETA_ALLOWED.includes(nextRole) ? prev.beta_user : false,
    }));
  };

  const handleChangeBeta = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingUser(prev => ({ ...prev, beta_user: e.target.checked }));
  };

  const handleUpdateUser = async () => {
    const { user_id, role, beta_user } = editingUser;
    const { error } = await supabase.rpc('update_user_privileges', {
      target_user_id: user_id,
      new_role: role,
      is_beta_user: !!beta_user,
    });
    if (error) {
      toast.error('Failed to update user privileges.');
      return;
    }
    toast.success('User privileges updated.');
    setShowEditModal(false);
    fetchUsers(0);
  };

  const isBetaAllowed = BETA_ALLOWED.includes(editingUser.role as AppRole);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-600 text-sm">{editingUser.email}</p>
              {getRoleChip(editingUser.role)}
            </div>
          </div>
        </div>

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={editingUser.role as AppRole}
              onChange={handleChangeRole}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {APP_ROLES.map(r => (
                <option key={r} value={r}>{APP_ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          
          {/* Beta User Toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!editingUser.beta_user}
                onChange={handleChangeBeta}
                disabled={!isBetaAllowed}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Beta User Access</span>
                <p className="text-xs text-gray-500">
                  {isBetaAllowed
                    ? 'Enable beta features for this user'
                    : 'Beta access only available for trainers and paid users'
                  }
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleUpdateUser}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Save Changes
          </button>
          <button
            onClick={() => {
              setShowEditModal(false);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

type AdminUserRow = {
  id: string; // Primary key from 'profiles'
  user_id: string;
  email: string;
  name: string | null;
  role: AppRole;
  beta_user: boolean;
  created_at: string;
  latest_beta_status: 'pending' | 'approved' | 'denied' | null;
  latest_beta_requested_at: string | null;
  latest_beta_request_id: string | null;
};

const itemsPerPage = 25;

export default function AdminUsersPage() {
  const { can } = useRole();
  const supabase = getSupabase();
  
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | null>(null);
  const [betaOnly, setBetaOnly] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  
  // Modals
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update user privileges via Supabase RPC
  const updatePrivileges = async (userId: string, newRole: string, isBeta: boolean) => {
    try {
      const { error } = await supabase.rpc('update_user_privileges', {
       target_user_id: userId,
       new_role: newRole,
       is_beta_user: isBeta,
      });

      if (error) {
        toast.error('Failed to update user privileges.');
        console.error('❌ RPC update_user_privileges error:', error);
        setCurrentPage(0);
        await fetchUsers(0);
      } else {
        toast.success('User privileges updated.');
        console.log('✅ RPC update_user_privileges success');
        return true;
      }
    } catch (err: any) {
      toast.error('Failed to update user privileges.');
      console.error('❌ RPC update_user_privileges exception:', err);
      return false;
    }
  };

  const fetchUsers = useCallback(async (page: number = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      // Direct table query - should fetch ALL users if admin JWT is present
      let query = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          name,
          email,
          role,
          beta_user,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Apply role filter if specified
      if (roleFilter) {
        query = query.eq('role', roleFilter);
      }

      // Apply search term if specified
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Apply beta filter if specified
      if (betaOnly === true) {
        query = query.eq('beta_user', true);
      }

      // Apply pagination
      const offset = page * itemsPerPage;
      
      // Fetch one extra to determine if there's a next page
      query = query.range(offset, offset + itemsPerPage);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching users:', error);
        // Check for admin permission errors and provide user-friendly message
        if (error.code === 'PGRST202' || error.message?.includes('not found') || error.message?.includes('permission')) {
          setError('You do not have permission to view this page. Admin access required.');
        } else {
          setError(error.message);
        }
        return;
      }

      // Enhanced debugging and validation
      console.log('Admin Users Query Result:', {
        query_executed: 'profiles table direct query',
        total_results: data?.length || 0,
        first_user: data?.[0] || null,
        filters_applied: {
          role: roleFilter,
          search: search,
          beta_only: betaOnly
        }
      });

      // UI fallback if no users are returned
      if (!data || data.length === 0) {
        console.warn('No users returned from profiles query - check RLS policies and admin JWT claims');
        if (!roleFilter && !search && !betaOnly) {
          setError('No users found. Verify your admin role and authentication status.');
        }
        setUsers([]);
        setHasNextPage(false);
        setCurrentPage(page);
        return;
      }
      const usersList = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        email: row.email,
        name: row.name,
        role: row.role,
        beta_user: row.beta_user,
        created_at: row.created_at,
        latest_beta_status: null, // Not available from direct profiles query
        latest_beta_requested_at: null,
        latest_beta_request_id: null,
      }));
      
      setHasNextPage(usersList.length > itemsPerPage);
      setCurrentPage(page);
      
      // Display only itemsPerPage items
      setUsers(usersList.slice(0, itemsPerPage));
      
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, betaOnly, supabase]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(0);
      fetchUsers(0);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    setCurrentPage(0);
    fetchUsers(0);
  }, [roleFilter, betaOnly]);

  // Initial load
  useEffect(() => {
    fetchUsers(0);
  }, []);
  
  // Check admin access
  if (!can('admin.panel')) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Admin Access Required</h3>
              <p className="text-red-700 text-sm">You do not have permission to view this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateUser = async (profileId: string, updatedFields: Partial<AdminUserRow>) => {
    if (!editingUser) return;
    
    setSaveError(null);
    
    const success = await updatePrivileges(editingUser.user_id, editingUser.role, editingUser.beta_user);
    
    if (success) {
      setShowEditModal(false);
      setEditingUser(null);
      setSaveError(null);
      await fetchUsers(0);
    } else {
      setSaveError('Failed to update user privileges. Please try again.');
    }
  };

  const handleProcessBetaRequest = async (requestId: string, approve: boolean, userName: string) => {
    try {
      const { error } = await supabase.rpc('process_beta_request', {
        request_id: requestId,
        approve: approve
      });

      if (error) {
        console.error('Error processing beta request:', error);
        toast.error('Failed to process beta request');
        return;
      }

      toast.success(`Beta request ${approve ? 'approved' : 'denied'} for ${userName}`);
      setCurrentPage(0);
      fetchUsers(0); // Refresh the list
    } catch (err: any) {
      console.error('Process beta request error:', err);
      toast.error('Failed to process beta request');
    }
  };

  const getBetaStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const configs = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
      approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Approved' },
      denied: { icon: XCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Denied' }
    };
    
    const config = configs[status as keyof typeof configs];
    if (!config) return null;
    
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${config.color}`}>
        <IconComponent size={12} />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const pendingBetaRequests = users.filter(user => user.latest_beta_status === 'pending');

  if (loading && users.length === 0) {
    return (
      <div className="p-6">
        <AdminHeader title="User Management" subtitle="Loading user data..." />
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <AdminHeader title="User Management" subtitle="Error loading data" />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button 
            onClick={() => fetchUsers(0)}
            className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pt-[44px]">
      <AdminHeader 
        title="User Management" 
        subtitle={`${users.length} users shown • ${pendingBetaRequests.length} pending beta requests`}
      />

      {/* Pending Beta Requests Panel */}
      {pendingBetaRequests.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={20} className="text-yellow-600" />
            <h3 className="font-medium text-yellow-900">Pending Beta Approvals ({pendingBetaRequests.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingBetaRequests.map((user) => (
              <div key={user.user_id} className="bg-white p-3 rounded border">
                <div className="font-medium text-gray-900">{user.name || user.email}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
                <div className="text-xs text-gray-500 mb-2">
                  Requested: {user.latest_beta_requested_at ? formatDate(user.latest_beta_requested_at) : 'Unknown'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => user.latest_beta_request_id && handleProcessBetaRequest(user.latest_beta_request_id, true, user.name || user.email)}
                    className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => user.latest_beta_request_id && handleProcessBetaRequest(user.latest_beta_request_id, false, user.name || user.email)}
                    className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={roleFilter || ''}
            onChange={(e) => setRoleFilter(e.target.value === '' ? null : e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="beta">Beta</option>
            <option value="trainer">Trainer</option>
            <option value="paid_user">Paid User</option>
            <option value="free_user">Free User</option>
          </select>

          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={betaOnly === true}
              onChange={(e) => setBetaOnly(e.target.checked ? true : null)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Beta Only</span>
          </label>

          <select
            value=""
            onChange={() => {}} // Disabled for now since direct profiles query doesn't have beta status
            disabled
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">User management table with role assignment capabilities</caption>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sign-up</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beta Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User size={16} className="text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name || 'No name'}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleChip(user.role)}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <span className="text-xs text-gray-500 italic">Full Access</span>
                      ) : user.beta_user ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle size={16} className="text-green-600" />
                          ✅
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <XCircle size={16} className="text-gray-400" />
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {getBetaStatusBadge(user.latest_beta_status)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditModal(true);
                          setSaveError(null);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label={`Edit user ${user.name || user.email}`}
                      >
                        <Edit size={16} className="text-gray-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {users.length} users
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(currentPage - 1)}
              disabled={currentPage === 0}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              onClick={() => fetchUsers(currentPage + 1)}
              disabled={!hasNextPage}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        supabase={supabase}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
        showEditModal={showEditModal}
        setShowEditModal={setShowEditModal}
        fetchUsers={fetchUsers}
        setSaveError={setSaveError}
      />
    </div>
  );
}