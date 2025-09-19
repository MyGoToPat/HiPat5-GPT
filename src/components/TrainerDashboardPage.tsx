import React, { useState } from 'react';
import { AppBar } from './AppBar';
import { NavigationSidebar } from './NavigationSidebar';
import { ClientProfileDrawer } from './ClientProfileDrawer';
import { MetricAlert, CrossMetricInsight } from '../types/metrics'; // Keep this import
import { AnalyticsDashboardSection } from './dashboard/AnalyticsDashboardSection';
import { PermissionsSettingsPage } from './dashboard/PermissionsSettingsPage';
import { InviteClientModal } from './InviteClientModal';
import { Search, Filter, Plus, MoreVertical, Users, UserCheck, UserX, AlertTriangle, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { UserProfile } from '../types/user';


interface Client {
  id: string;
  profilePicture?: string;
  name: string;
  email: string;
  phone?: string;
  lastLogin: Date;
  status: 'active' | 'inactive' | 'trial' | 'suspended';
  role: 'client' | 'premium' | 'enterprise';
  assignedAgents: string[];
  joinedDate: Date;
  subscription?: {
    plan: string;
    status: 'active' | 'cancelled' | 'past_due';
    renewalDate: Date;
  };
  metrics?: {
    workoutStreak: number;
    lastWorkout?: Date;
    goalCompletion: number;
  };
}

interface TrainerDashboardPageProps {
  userProfile: UserProfile | null;
}

export const TrainerDashboardPage: React.FC<TrainerDashboardPageProps> = ({ userProfile }) => {
  const [activeView, setActiveView] = useState<'clients' | 'analytics' | 'permissions'>('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'trial'>('all');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showClientDrawer, setShowClientDrawer] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const clientsPerPage = 10;

  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
  // TODO: Replace with actual API call when backend is ready
  const mockClients: Client[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      phone: '+1 (555) 123-4567',
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'active',
      role: 'premium',
      assignedAgents: ['meal-tracker', 'workout-tracker'],
      joinedDate: new Date('2024-01-15'),
      subscription: {
        plan: 'Premium',
        status: 'active',
        renewalDate: new Date('2024-02-15')
      },
      metrics: {
        workoutStreak: 12,
        lastWorkout: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        goalCompletion: 85
      }
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael.chen@email.com',
      phone: '+1 (555) 234-5678',
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      status: 'active',
      role: 'client',
      assignedAgents: ['meal-tracker'],
      joinedDate: new Date('2024-01-20'),
      subscription: {
        plan: 'Basic',
        status: 'active',
        renewalDate: new Date('2024-02-20')
      },
      metrics: {
        workoutStreak: 5,
        lastWorkout: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        goalCompletion: 72
      }
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      email: 'emily.rodriguez@email.com',
      lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      status: 'inactive',
      role: 'client',
      assignedAgents: [],
      joinedDate: new Date('2023-12-10'),
      subscription: {
        plan: 'Basic',
        status: 'cancelled',
        renewalDate: new Date('2024-01-10')
      },
      metrics: {
        workoutStreak: 0,
        lastWorkout: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        goalCompletion: 23
      }
    },
    {
      id: '4',
      name: 'David Thompson',
      email: 'david.thompson@email.com',
      phone: '+1 (555) 345-6789',
      lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      status: 'trial',
      role: 'client',
      assignedAgents: ['meal-tracker', 'workout-tracker', 'meal-planner'],
      joinedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      metrics: {
        workoutStreak: 3,
        lastWorkout: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        goalCompletion: 90
      }
    },
    {
      id: '5',
      name: 'Lisa Park',
      email: 'lisa.park@email.com',
      phone: '+1 (555) 456-7890',
      lastLogin: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      status: 'active',
      role: 'enterprise',
      assignedAgents: ['meal-tracker', 'workout-tracker', 'meal-planner', 'restaurant-finder'],
      joinedDate: new Date('2023-11-05'),
      subscription: {
        plan: 'Enterprise',
        status: 'active',
        renewalDate: new Date('2024-11-05')
      },
      metrics: {
        workoutStreak: 28,
        lastWorkout: new Date(Date.now() - 12 * 60 * 60 * 1000),
        goalCompletion: 95
      }
    },
    {
      id: '6',
      name: 'James Wilson',
      email: 'james.wilson@email.com',
      lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      status: 'suspended',
      role: 'client',
      assignedAgents: [],
      joinedDate: new Date('2024-01-01'),
      subscription: {
        plan: 'Basic',
        status: 'past_due',
        renewalDate: new Date('2024-01-31')
      },
      metrics: {
        workoutStreak: 0,
        lastWorkout: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        goalCompletion: 15
      }
    }
  ];

  // Filter clients based on search and status
  const filteredClients = mockClients.filter(client => {
    const matchesSearch = (typeof client.name === 'string' && typeof searchQuery === 'string' && 
                          client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (typeof client.email === 'string' && typeof searchQuery === 'string' && 
                          client.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / clientsPerPage);
  const startIndex = (currentPage - 1) * clientsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + clientsPerPage);

  // Status badge styling
  const getStatusBadge = (status: Client['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      trial: 'bg-blue-100 text-blue-800 border-blue-200',
      suspended: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Role badge styling
  const getRoleBadge = (role: Client['role']) => {
    const styles = {
      client: 'bg-gray-100 text-gray-700',
      premium: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-yellow-100 text-yellow-700'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${styles[role]}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  // Format last login time
  const formatLastLogin = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  // Handle client selection
  const handleClientSelect = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedClients.length === paginatedClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(paginatedClients.map(client => client.id));
    }
  };

  // Handle client row click
  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientDrawer(true);
  };

  // Handle client save from drawer
  const handleClientSave = (updatedClient: Client) => {
    // TODO: Update client in backend
    console.log('Saving client:', updatedClient);
    setShowClientDrawer(false);
    // TODO: Refresh client list or update local state
  };

  // Handle client delete from drawer
  const handleClientDelete = (clientId: string) => {
    // TODO: Delete client from backend
    console.log('Deleting client:', clientId);
    setShowClientDrawer(false);
    // TODO: Refresh client list or update local state
  };

  // Handle invite sent
  const handleInviteSent = (email: string) => {
    // TODO: Refresh pending invites or update local state
    console.log('Invite sent to:', email);
    // TODO: Show success toast
  };

  // Get summary stats
  const stats = {
    total: mockClients.length,
    active: mockClients.filter(c => c.status === 'active').length,
    trial: mockClients.filter(c => c.status === 'trial').length,
    atRisk: mockClients.filter(c => 
      c.status === 'inactive' || 
      c.status === 'suspended' || 
      (c.metrics && c.metrics.goalCompletion < 50)
    ).length
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-[44px]">
      <div className="p-6">
        {/* View Toggle */}
        <div className="mb-6">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveView('clients')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'clients'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Client Management
            </button>
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'analytics'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Analytics Dashboard
            </button>
            <button
              onClick={() => setActiveView('permissions')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === 'permissions'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Permissions Demo
            </button>
          </div>
        </div>
      
        {/* Conditional Content */}
        {activeView === 'analytics' ? (
          <AnalyticsDashboardSection />
        ) : activeView === 'permissions' ? (
          <PermissionsSettingsPage 
            clientId="demo-client" 
            isTrainerView={true}
            onPermissionChange={(domain, level) => console.log('Permission changed:', domain, level)}
          />
        ) : (
          <>
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
              <p className="text-gray-600 mt-1">Manage your clients and track their progress</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={20} />
              Invite Client
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-gray-600 text-sm">Total Clients</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck size={24} className="text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  <p className="text-gray-600 text-sm">Active Clients</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserCheck size={24} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.trial}</p>
                  <p className="text-gray-600 text-sm">Trial Users</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.atRisk}</p>
                  <p className="text-gray-600 text-sm">At Risk</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search clients by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="trial">Trial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedClients.length > 0 && (
            <div className="px-6 py-3 bg-blue-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 font-medium">
                  {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                    Assign Agent
                  </button>
                  <button className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Client Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              // Loading State
              <div className="p-8">
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                      <div className="w-4 h-4 bg-gray-200 rounded"></div>
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                      <div className="w-20 h-6 bg-gray-200 rounded"></div>
                      <div className="w-16 h-6 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : paginatedClients.length === 0 ? (
              // Empty State
              <div className="p-12 text-center">
                <Users size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || statusFilter !== 'all' ? 'No clients found' : 'No clients yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters' // eslint-disable-next-line react/jsx-key
                    : 'Invite your first client to get started'
                  }
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Invite Client
                  </button>
                )}
              </div>
            ) : (
              // Client Table
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="w-12 px-6 py-3 text-left">
                      <button
                        onClick={handleSelectAll}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedClients.length === paginatedClients.length ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedClients.map((client) => ( // eslint-disable-next-line react/jsx-key
                    <tr 
                      key={client.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleClientClick(client)}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClientSelect(client.id);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {selectedClients.includes(client.id) ? (
                            <CheckSquare size={16} className="text-blue-600" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                            {client.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-600">{client.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(client.status)}
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(client.role)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatLastLogin(client.lastLogin)}
                      </td>
                      <td className="px-6 py-4">
                        {client.metrics && (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${client.metrics.goalCompletion}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {client.metrics.goalCompletion}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Open action menu
                            console.log('Actions for:', client.name);
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(startIndex + clientsPerPage, filteredClients.length)} of {filteredClients.length} clients
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="px-3 py-1 text-sm font-medium">
                    {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TODO Comments for Future Implementation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Implementation Notes</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• TODO: Connect to backend API for client data</li>
            <li>• TODO: Add real-time updates for client status</li>
            <li>• TODO: Implement bulk actions (assign agents, remove clients)</li>
            <li>• TODO: Add export functionality for client data</li>
          </ul>
        </div>
          </>
        )}
      </div>

      {/* Client Profile Drawer */}
      <ClientProfileDrawer
        isOpen={showClientDrawer}
        client={selectedClient}
        onClose={() => setShowClientDrawer(false)}
        onSave={handleClientSave}
        onDelete={handleClientDelete}
      />

      {/* Invite Client Modal */}
      <InviteClientModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={handleInviteSent}
      />
    </div>
  );
};