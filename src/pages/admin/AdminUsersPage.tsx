import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../../lib/supabase';
import { Search, Filter, ChevronLeft, ChevronRight, UserCheck, UserX, Crown, User, Building, Clock, CheckCircle, XCircle, AlertTriangle, Edit, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminHeader from '../../components/admin/AdminHeader';

type AdminUserRow = {
  user_id: string;
  email: string;
  name: string | null;
  role: 'user' | 'trainer' | 'admin';
  plan_type: 'free' | 'trial' | 'paid_user' | 'enterprise';
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
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'user' | 'trainer' | 'admin' | null>(null);
  const [planFilter, setPlanFilter] = useState<'free' | 'trial' | 'paid_user' | 'enterprise' | null>(null);
  const [betaOnly, setBetaOnly] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'denied' | null>(null);
  
  // Pagination
  const [cursors, setCursors] = useState<PaginationCursor[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  
  // Modals
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
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
        plan_filter: planFilter,
        beta_only: betaOnly,
        status_filter: statusFilter,
        limit: 25,
        after_created_at: afterCreatedAt,
        after_id: afterId
      });

      if (error) {
        console.error('Error fetching users:', error);
        setError(error.message);
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
  }, [search, roleFilter, planFilter, betaOnly, statusFilter, cursors, supabase]);

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
  }, [roleFilter, planFilter, betaOnly, statusFilter]);

  // Initial load
  useEffect(() => {
    fetchUsers('first');
  }, []);

  const handleProcessBetaRequest = async (requestId: string, approve: boolean, userName: string) => {
    try {
      const { error } = await supabase.rpc('admin_process_beta_request', {
        request_id: requestId,
        approve: approve,
        note: approve ? `Beta access approved for ${userName}` : `Beta access denied for ${userName}`
      });

      if (error) {
        console.error('Error processing beta request:', error);
        toast.error(`Failed to ${approve ? 'approve' : 'deny'} request`);
        return;
      }

      toast.success(`Beta request ${approve ? 'approved' : 'denied'} for ${userName}`);
      fetchUsers('first'); // Refresh the list
    } catch (err: any) {
      console.error('Process beta request error:', err);
      toast.error('Failed to process request');
    }
  };

  const handleUpdateUser = async (userId: string, updates: { role?: string; plan_type?: string; beta_user?: boolean }) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        toast.error('Failed to update user');
        return;
      }

      toast.success('User updated successfully');
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers('first'); // Refresh the list
    } catch (err: any) {
      console.error('Update user error:', err);
      toast.error('Failed to update user');
    }
  };

  const getRoleChip = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 border-red-200',
      trainer: 'bg-blue-100 text-blue-800 border-blue-200',
      user: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    const icons = {
      admin: Crown,
      trainer: UserCheck,
      user: User
    };
    const IconComponent = icons[role as keyof typeof icons] || User;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${colors[role as keyof typeof colors] || colors.user}`}>
        <IconComponent size={12} />
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const getPlanChip = (planType: string) => {
    const colors = {
      enterprise: 'bg-purple-100 text-purple-800 border-purple-200',
      paid_user: 'bg-green-100 text-green-800 border-green-200',
      trial: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      free: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    const icons = {
      enterprise: Building,
      paid_user: CheckCircle,
      trial: Clock,
      free: User
    };
    const IconComponent = icons[planType as keyof typeof icons] || User;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${colors[planType as keyof typeof colors] || colors.free}`}>
        <IconComponent size={12} />
        {planType === 'paid_user' ? 'Paid' : planType.charAt(0).toUpperCase() + planType.slice(1)}
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
            onChange={(e) => setRoleFilter(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="trainer">Trainer</option>
            <option value="user">User</option>
          </select>

          <select
            value={planFilter || ''}
            onChange={(e) => setPlanFilter(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Plans</option>
            <option value="enterprise">Enterprise</option>
            <option value="paid_user">Paid User</option>
            <option value="trial">Trial</option>
            <option value="free">Free</option>
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
            onChange={(e) => setStatusFilter(e.target.value || null)}
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
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beta</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sign-up</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beta Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <User size={48} className="text-gray-400" />
                      <p className="text-gray-500">No users found</p>
                      <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.name || 'No name'}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleChip(user.role)}
                    </td>
                    <td className="px-6 py-4">
                      {getPlanChip(user.plan_type)}
                    </td>
                    <td className="px-6 py-4">
                      {user.beta_user ? (
                        <UserCheck size={16} className="text-green-500" />
                      ) : (
                        <UserX size={16} className="text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      {user.latest_beta_status ? (
                        <div className="space-y-1">
                          {getBetaStatusBadge(user.latest_beta_status)}
                          {user.latest_beta_status === 'pending' && user.latest_beta_request_id && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleProcessBetaRequest(user.latest_beta_request_id!, true, user.name || user.email)}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleProcessBetaRequest(user.latest_beta_request_id!, false, user.name || user.email)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                              >
                                Deny
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No requests</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditModal(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowEditModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <p className="text-gray-600 text-sm">{editingUser.email}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  defaultValue={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
                <select
                  defaultValue={editingUser.plan_type}
                  onChange={(e) => setEditingUser({ ...editingUser, plan_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free</option>
                  <option value="trial">Trial</option>
                  <option value="paid_user">Paid User</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingUser.beta_user}
                    onChange={(e) => setEditingUser({ ...editingUser, beta_user: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Beta User</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateUser(editingUser.user_id, {
                  role: editingUser.role,
                  plan_type: editingUser.plan_type,
                  beta_user: editingUser.beta_user
                })}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}