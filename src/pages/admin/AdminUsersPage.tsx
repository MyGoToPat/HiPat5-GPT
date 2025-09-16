import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../../lib/supabase';
import { Search, Filter, ChevronLeft, ChevronRight, UserCheck, UserX, Crown, User, Building, Clock, CheckCircle, XCircle, AlertTriangle, Edit, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminHeader from '../../components/admin/AdminHeader';
import { useRole } from '../../hooks/useRole';
import { type AppRole, getRoleDisplayName } from '../../config/rbac';

type AdminUserRow = {
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

interface PaginationCursor {
  created_at: string;
  user_id: string;
}

export default function AdminUsersPage() {
  const { can } = useRole();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | null>(null);
  const [betaOnly, setBetaOnly] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'denied' | null>(null);
  
  // Pagination
  const [cursors, setCursors] = useState<PaginationCursor[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  
  // Modals
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const supabase = getSupabase();
  
  const fetchUsers = useCallback(async (direction: 'first' | 'next' | 'prev' = 'first') => {
    setLoading(true);
    setError(null);
    
    try {
      let afterCreatedAt: string | null = null;
      let afterId: string | null = null;
      
      if (direction === 'next' && cursors.length > 0) {
        const lastCursor = cursors[cursors.length - 1];
        afterCreatedAt = lastCursor.created_at;
        afterId = lastCursor.user_id;
      } else if (direction === 'prev' && cursors.length > 1) {
        // Remove current page cursor and use previous
        const newCursors = cursors.slice(0, -1);
        setCursors(newCursors);
        if (newCursors.length > 0) {
          const prevCursor = newCursors[newCursors.length - 1];
          afterCreatedAt = prevCursor.created_at;
          afterId = prevCursor.user_id;
        }
      } else if (direction === 'first') {
        setCursors([]);
      }

      const { data, error } = await supabase.rpc('admin_user_list_compact', {
        search_query: search || null,
        role_filter: roleFilter,
        plan_filter: null,
        beta_only: betaOnly,
        status_filter: statusFilter,
        limit: 25,
        after_created_at: afterCreatedAt,
        after_id: afterId
      });

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

      const usersList = data || [];
      setUsers(usersList);
      
      // Update pagination state
      setHasNextPage(usersList.length === 25);
      
      if (direction === 'next' && usersList.length > 0) {
        const lastUser = usersList[usersList.length - 1];
        setCursors(prev => [...prev, { created_at: lastUser.created_at, user_id: lastUser.user_id }]);
      }
      
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, betaOnly, statusFilter, cursors, supabase]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers('first');
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search]);

  // Fetch when filters change
  useEffect(() => {
    fetchUsers('first');
  }, [roleFilter, betaOnly, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchUsers('first');
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

  const handleUpdateUser = async (
    userId: string,
    updates: { role?: AppRole; plan_type?: string; beta_user?: boolean }
  ) => {
    setSaveError(null);
    
    try {
      console.log("UPDATING USER", userId, updates);

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating user:', error);
        
        if (
          error.message?.includes('profiles_role_check_std') || 
            error.message?.includes('violates check constraint') ||
            error.message?.includes('check constraint') ||
            error.message?.includes('constraint') ||
            error.code === '23514'
        ) {
          setSaveError("This role is not allowed by the database constraint. Please run the role constraint migration first.");
          toast.error('Role change failed: Database constraint violation');
          return;
        }
        
        const errorMsg = error.message || 'Unknown database error';
        setSaveError(errorMsg);
        toast.error(`Failed to update user: ${errorMsg}`);
        return;
      }

      toast.success(`User updated successfully: Role=${updates.role}, Beta=${updates.beta_user}`);
      setShowEditModal(false);
      setEditingUser(null);
      setSaveError(null);
      
      await fetchUsers('first');
    } catch (err: any) {
      console.error('Update user error:', err);
      const errorMsg = err.message || 'An unexpected error occurred';
      setSaveError(errorMsg);
      toast.error(`Failed to update user: ${errorMsg}`);
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
      fetchUsers('first'); // Refresh the list
    } catch (err: any) {
      console.error('Process beta request error:', err);
      toast.error('Failed to process beta request');
    }
  };

  const getRoleChip = (role: AppRole) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      trainer: 'bg-blue-100 text-blue-800 border-blue-200',
      beta: 'bg-purple-100 text-purple-800 border-purple-200',
      paid_user: 'bg-green-100 text-green-800 border-green-200',
      free_user: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    const icons = {
      admin: Crown,
      trainer: UserCheck,
      beta: UserCheck,
      paid_user: CheckCircle,
      free_user: User
    };
    const IconComponent = icons[role] || User;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${colors[role] || colors.free_user}`}>
        <IconComponent size={12} />
        {getRoleDisplayName(role)}
      </span>
    );
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
            onClick={() => fetchUsers('first')}
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
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value === '' ? null : e.target.value as any)}
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
                      {user.beta_user ? (
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
              onClick={() => fetchUsers('prev')}
              disabled={cursors.length <= 1}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              onClick={() => fetchUsers('next')}
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
      {showEditModal && editingUser && (
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
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as AppRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">Admin</option>
                  <option value="beta">Beta</option>
                  <option value="trainer">Trainer</option>
                  <option value="free_user">Free User</option>
                  <option value="paid_user">Paid User</option>
                </select>
              </div>
              
              {/* Beta User Toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.beta_user}
                    onChange={(e) => setEditingUser({ ...editingUser, beta_user: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Beta User Access</span>
                    <p className="text-xs text-gray-500">Enable beta features for this user</p>
                  </div>
                </label>
              </div>

              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm">{saveError}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => handleUpdateUser(editingUser.user_id, { 
                  role: editingUser.role,
                  beta_user: editingUser.beta_user,
                })}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  setSaveError(null);
                }}
                className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}