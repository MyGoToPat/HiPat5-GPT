import React, { useState } from 'react';
import { ProgressTabEnhanced } from './dashboard/ProgressTabEnhanced';
import { AISummaryTab } from './dashboard/AISummaryTab';
import { PTDirectivesTab } from './dashboard/PTDirectivesTab';
import { WorkoutPlansTab } from './dashboard/WorkoutPlansTab';
import { X, Edit3, Save, User, Mail, Phone, MapPin, Calendar, Target, CreditCard, Settings, Shield, FileText, AlertTriangle, TrendingUp, Download, Copy, Trash2, Plus, Activity } from 'lucide-react';

interface Client {
  id: string;
  profilePicture?: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  dateOfBirth?: string;
  bio?: string;
  goals?: string[];
  lastLogin: Date;
  status: 'active' | 'inactive' | 'trial' | 'suspended';
  role: 'client' | 'premium' | 'enterprise';
  assignedAgents: string[];
  joinedDate: Date;
  subscription?: {
    plan: string;
    status: 'active' | 'cancelled' | 'past_due';
    renewalDate: Date;
    price: number;
    paymentMethod?: string;
  };
  metrics?: {
    workoutStreak: number;
    lastWorkout?: Date;
    goalCompletion: number;
    totalWorkouts: number;
    avgSleep: number;
    proteinAdherence: number;
  };
  permissions?: {
    workouts: 'none' | 'read' | 'edit' | 'assign';
    meals: 'none' | 'read' | 'edit' | 'assign';
    progress: 'none' | 'read' | 'edit' | 'assign';
    profile: 'none' | 'read' | 'edit' | 'assign';
    chat: 'none' | 'read' | 'edit' | 'assign';
    agents: 'none' | 'read' | 'edit' | 'assign';
  };
}

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  assigned: boolean;
  tone?: 'professional' | 'friendly' | 'casual';
  strictness?: number; // 1-10
  dataPermissions?: {
    workouts: boolean;
    meals: boolean;
    sleep: boolean;
    biometrics: boolean;
  };
}

interface Note {
  id: string;
  content: string;
  timestamp: Date;
  authorName: string;
  authorId: string;
}

interface BillingRecord {
  id: string;
  amount: number;
  method: string;
  date: Date;
  status: 'paid' | 'pending' | 'failed';
  receiptUrl?: string;
}

interface ClientProfileDrawerProps {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSave: (client: Client) => void;
  onDelete?: (clientId: string) => void;
}

type TabType = 'overview' | 'progress' | 'ai-summary' | 'directives' | 'workout-plans' | 'subscription' | 'agents' | 'permissions' | 'notes';

export const ClientProfileDrawer: React.FC<ClientProfileDrawerProps> = ({
  isOpen,
  client,
  onClose,
  onSave,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<Client | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mock data for agents
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([
    {
      id: 'meal-tracker',
      name: 'Meal Tracker',
      description: 'Helps log and analyze meals',
      assigned: client?.assignedAgents.includes('meal-tracker') || false,
      tone: 'friendly',
      strictness: 7,
      dataPermissions: { workouts: false, meals: true, sleep: false, biometrics: false }
    },
    {
      id: 'workout-tracker',
      name: 'Workout Tracker',
      description: 'Tracks workouts and progress',
      assigned: client?.assignedAgents.includes('workout-tracker') || false,
      tone: 'professional',
      strictness: 8,
      dataPermissions: { workouts: true, meals: false, sleep: false, biometrics: true }
    },
    {
      id: 'meal-planner',
      name: 'Meal Planner',
      description: 'Creates personalized meal plans',
      assigned: client?.assignedAgents.includes('meal-planner') || false,
      tone: 'casual',
      strictness: 6,
      dataPermissions: { workouts: true, meals: true, sleep: false, biometrics: false }
    },
    {
      id: 'sleep-coach',
      name: 'Sleep Coach',
      description: 'Optimizes sleep patterns',
      assigned: false,
      tone: 'professional',
      strictness: 9,
      dataPermissions: { workouts: false, meals: false, sleep: true, biometrics: true }
    }
  ]);

  // Mock notes data
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      content: 'Client is very motivated and consistent with workouts. Needs help with meal planning.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      authorName: 'Dr. Sarah Wilson',
      authorId: 'trainer1'
    },
    {
      id: '2',
      content: 'Increased protein target to 180g based on new training program.',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      authorName: 'Mike Johnson',
      authorId: 'trainer2'
    },
    {
      id: '3',
      content: 'Client reported better sleep quality after adjusting evening routine.',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      authorName: 'Dr. Sarah Wilson',
      authorId: 'trainer1'
    }
  ]);

  // Mock billing data
  const billingHistory: BillingRecord[] = [
    {
      id: '1',
      amount: 29.99,
      method: '**** 4242',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: 'paid'
    },
    {
      id: '2',
      amount: 29.99,
      method: '**** 4242',
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      status: 'paid'
    },
    {
      id: '3',
      amount: 29.99,
      method: '**** 4242',
      date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      status: 'failed'
    }
  ];

  React.useEffect(() => {
    if (client && isOpen) {
      setEditedClient({ ...client });
      setIsEditing(false);
      setActiveTab('overview');
    }
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'ai-summary', label: 'AI Summary', icon: Target },
    { id: 'directives', label: 'PT Directives', icon: Settings },
    { id: 'workout-plans', label: 'Workout Plans', icon: Activity },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'agents', label: 'Agent Management', icon: Settings },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'notes', label: 'Notes/History', icon: FileText }
  ];

  const handleSave = async () => {
    if (!editedClient) return;
    
    setIsLoading(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      onSave(editedClient);
      setIsEditing(false);
      setIsLoading(false);
      // TODO: Show success toast
      console.log('Client saved successfully');
    }, 1000);
  };

  const handleCancel = () => {
    setEditedClient(client ? { ...client } : null);
    setIsEditing(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: Date.now().toString(),
      content: newNote.trim(),
      timestamp: new Date(),
      authorName: 'Current Trainer', // TODO: Get from auth context
      authorId: 'current-trainer'
    };
    
    setNotes(prev => [note, ...prev]);
    setNewNote('');
    // TODO: Save note to backend
    console.log('Note added:', note);
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
    // TODO: Delete note from backend
    console.log('Note deleted:', noteId);
  };

  const handleAgentToggle = (agentId: string) => {
    setAgentConfigs(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, assigned: !agent.assigned }
        : agent
    ));
    // TODO: Update agent assignments in backend
    console.log('Agent toggled:', agentId);
  };

  const handleAgentConfigChange = (agentId: string, field: string, value: unknown) => {
    setAgentConfigs(prev => prev.map(agent => 
      agent.id === agentId 
        ? { ...agent, [field]: value }
        : agent
    ));
    // TODO: Update agent config in backend
    console.log('Agent config changed:', agentId, field, value);
  };

  const handlePermissionChange = (domain: string, permission: string) => {
    if (!editedClient) return;
    
    setEditedClient(prev => prev ? {
      ...prev,
      permissions: {
        ...prev.permissions,
        [domain]: permission
      }
    } : null);
  };

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

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Profile Picture */}
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
          {client.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(client.status)}
            <span className="text-sm text-gray-500">
              Joined {client.joinedDate.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label key="full-name-label" className="block text-sm font-medium text-gray-700 mb-1">
            <User size={16} className="inline mr-1" />
            Full Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedClient?.name || ''}
              onChange={(e) => setEditedClient(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="px-3 py-2 bg-gray-50 rounded-lg">{client.name}</p>
          )}
        </div>

        <div>
          <label key="email-label" className="block text-sm font-medium text-gray-700 mb-1">
            <Mail size={16} className="inline mr-1" />
            Email
          </label>
          {isEditing ? (
            <input
              type="email"
              value={editedClient?.email || ''}
              onChange={(e) => setEditedClient(prev => prev ? { ...prev, email: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="px-3 py-2 bg-gray-50 rounded-lg">{client.email}</p>
          )}
        </div>

        <div>
          <label key="phone-label" className="block text-sm font-medium text-gray-700 mb-1">
            <Phone size={16} className="inline mr-1" />
            Phone
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={editedClient?.phone || ''}
              onChange={(e) => setEditedClient(prev => prev ? { ...prev, phone: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="px-3 py-2 bg-gray-50 rounded-lg">{client.phone || 'Not provided'}</p>
          )}
        </div>

        <div>
          <label key="location-label" className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin size={16} className="inline mr-1" />
            Location
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedClient?.location || ''}
              onChange={(e) => setEditedClient(prev => prev ? { ...prev, location: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="px-3 py-2 bg-gray-50 rounded-lg">{client.location || 'Not provided'}</p>
          )}
        </div>

        <div>
          <label key="dob-label" className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar size={16} className="inline mr-1" />
            Date of Birth
          </label>
          {isEditing ? (
            <input
              type="date"
              value={editedClient?.dateOfBirth || ''}
              onChange={(e) => setEditedClient(prev => prev ? { ...prev, dateOfBirth: e.target.value } : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="px-3 py-2 bg-gray-50 rounded-lg">
              {client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : 'Not provided'}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        {isEditing ? (
          <textarea
            value={editedClient?.bio || ''}
            onChange={(e) => setEditedClient(prev => prev ? { ...prev, bio: e.target.value } : null)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Tell us about this client..."
          />
        ) : (
          <p className="px-3 py-2 bg-gray-50 rounded-lg min-h-[80px]">
            {client.bio || 'No bio provided'}
          </p>
        )}
      </div>

      {/* Goals */}
      <div>
        <label key="goals-label" className="block text-sm font-medium text-gray-700 mb-1">
          <Target size={16} className="inline mr-1" />
          Goals
        </label>
        <div className="flex flex-wrap gap-2">
          {client.goals?.map((goal, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {goal}
            </span>
          )) || <span className="text-gray-500 text-sm">No goals set</span>}
        </div>
      </div>
    </div>
  );

  const renderProgressTab = () => (
    <ProgressTabEnhanced 
      clientId={client.id}
      timeframe="30d"
      onTimeframeChange={(timeframe) => console.log('Timeframe changed:', timeframe)}
    />
  );

  const renderSubscriptionTab = () => (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Current Plan</h4>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            client.subscription?.status === 'active' ? 'bg-green-100 text-green-800' :
            client.subscription?.status === 'past_due' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {client.subscription?.status || 'Unknown'}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">{client.subscription?.plan || 'No Plan'}</p>
            <p className="text-gray-600">${client.subscription?.price || 0}/month</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Next renewal</p>
            <p className="font-medium text-gray-900">
              {client.subscription?.renewalDate.toLocaleDateString() || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
            Change Plan
          </button>
          <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors">
            Cancel Subscription
          </button>
          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
            Renew Now
          </button>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Payment Method</h4>
        <div className="flex items-center gap-3">
          <div className="w-12 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
            VISA
          </div>
          <div>
            <p className="font-medium text-gray-900">{client.subscription?.paymentMethod || '**** **** **** 4242'}</p>
            <p className="text-sm text-gray-600">Expires 12/25</p>
          </div>
          <button className="ml-auto px-3 py-1 text-blue-600 hover:text-blue-700 text-sm">
            Update
          </button>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Billing History</h4>
        </div>
        
        {isLoading ? (
          <div className="p-6">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-16 h-4 bg-gray-200 rounded"></div>
                  <div className="w-20 h-4 bg-gray-200 rounded"></div>
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  <div className="w-16 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : billingHistory.length === 0 ? (
          <div className="p-6 text-center">
            <CreditCard size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No billing history available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {billingHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      ${record.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.method}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {record.date.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        record.status === 'paid' ? 'bg-green-100 text-green-800' :
                        record.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm">
                        <Download size={14} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderAgentsTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">AI Agent Management</h4>
        <p className="text-sm text-blue-700">
          Configure which AI agents are available to this client and customize their behavior.
        </p>
      </div>

      {agentConfigs.map((agent) => (
        <div key={agent.id} className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900">{agent.name}</h4>
              <p className="text-sm text-gray-600">{agent.description}</p>
            </div>
            <button
              onClick={() => handleAgentToggle(agent.id)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                agent.assigned ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  agent.assigned ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {agent.assigned && (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {/* Tone Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Tone
                </label>
                <select
                  value={agent.tone}
                  onChange={(e) => handleAgentConfigChange(agent.id, 'tone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                </select>
              </div>

              {/* Strictness Slider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recommendation Strictness: {agent.strictness}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={agent.strictness}
                  onChange={(e) => handleAgentConfigChange(agent.id, 'strictness', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Flexible</span>
                  <span>Strict</span>
                </div>
              </div>

              {/* Data Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Access Permissions // eslint-disable-next-line react/jsx-key
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(agent.dataPermissions || {}).map(([key, value]: [string, boolean]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAgentConfigChange(agent.id, 'dataPermissions', {
                          ...agent.dataPermissions,
                          [key]: e.target.checked
                        })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* TODO Comment */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>TODO:</strong> Connect agent assignments and configurations to backend API
        </p>
      </div>
    </div>
  );

  const renderPermissionsTab = () => {
    const permissions = editedClient?.permissions || {
      workouts: 'read',
      meals: 'read',
      progress: 'read',
      profile: 'edit',
      chat: 'read',
      agents: 'none'
    };

    const domains = [
      { key: 'workouts', label: 'Workouts', description: 'Exercise tracking and workout plans' },
      { key: 'meals', label: 'Meals', description: 'Nutrition logging and meal planning' },
      { key: 'progress', label: 'Progress', description: 'Metrics, charts, and analytics' },
      { key: 'profile', label: 'Profile', description: 'Personal information and settings' },
      { key: 'chat', label: 'Chat', description: 'Conversation history and messages' },
      { key: 'agents', label: 'Agents', description: 'AI agent management and configuration' }
    ];

    const permissionOptions = [
      { value: 'none', label: 'None', color: 'text-gray-600' },
      { value: 'read', label: 'Read', color: 'text-blue-600' },
      { value: 'edit', label: 'Edit', color: 'text-green-600' },
      { value: 'assign', label: 'Assign', color: 'text-purple-600' }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-medium text-yellow-900 mb-2">Data Access Permissions</h4>
          <p className="text-sm text-yellow-700">
            Control what data this client can access and modify. Changes take effect immediately.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Permission Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {domains.map((domain) => (
                <tr key={domain.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{domain.label}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={permissions[domain.key as keyof typeof permissions]}
                      onChange={(e) => handlePermissionChange(domain.key, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {permissionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {domain.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Permission Levels Legend */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h5 className="font-medium text-gray-900 mb-3">Permission Levels</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permissionOptions.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  option.value === 'none' ? 'bg-gray-400' :
                  option.value === 'read' ? 'bg-blue-400' :
                  option.value === 'edit' ? 'bg-green-400' :
                  'bg-purple-400'
                }`}></div>
                <span className={`font-medium ${option.color}`}>{option.label}</span>
                <span className="text-sm text-gray-600">
                  {option.value === 'none' && '- No access'}
                  {option.value === 'read' && '- View only'}
                  {option.value === 'edit' && '- View and modify'}
                  {option.value === 'assign' && '- Full control'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TODO Comment */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Implementation TODOs</h4>
          <p className="text-sm text-blue-800">
            <strong>TODO:</strong> Implement permission enforcement in backend API and client applications
          </p>
        </div>
      </div>
    );
  };

  const renderNotesTab = () => (
    <div className="space-y-6">
      {/* Add New Note */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Add New Note</h4>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note about this client..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            Add Note
          </button>
        </div>
      </div>

      {/* Notes History */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Notes History</h4>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="p-6 text-center">
              <FileText size={32} className="text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No notes yet</p>
              <p className="text-gray-400 text-sm">Add your first note above</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notes.map((note) => (
                <div key={note.id} className="p-6 hover:bg-gray-50 group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-gray-900 leading-relaxed">{note.content}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                        <span>{note.authorName}</span>
                        <span>•</span>
                        <span>{note.timestamp.toLocaleDateString()} at {note.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600">
                        <Copy size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TODO Comment */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <p className="text-sm text-green-800">
          <strong>TODO:</strong> Implement note persistence, rich text editing, and note search functionality
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-4xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
              {client.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{client.name}</h2>
              <p className="text-gray-600">{client.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <Edit3 size={16} />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'progress' && renderProgressTab()}
          {activeTab === 'ai-summary' && (
            <AISummaryTab 
              clientId={client.id}
              onPersonalityChange={(personality) => console.log('Personality changed:', personality)}
            />
          )}
          {activeTab === 'directives' && (
            <PTDirectivesTab clientId={client.id} />
          )}
          {activeTab === 'workout-plans' && (
            <WorkoutPlansTab clientId={client.id} />
          )}
          {activeTab === 'subscription' && renderSubscriptionTab()}
          {activeTab === 'agents' && renderAgentsTab()}
          {activeTab === 'permissions' && renderPermissionsTab()}
          {activeTab === 'notes' && renderNotesTab()}
        </div>

        {/* Fixed Footer - Save/Cancel Buttons */}
        {isEditing && (
          <div className="border-t border-gray-200 p-6 bg-white">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
              >
                <Trash2 size={16} />
                Delete Client
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-60" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-60 max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Client</h3>
                  <p className="text-gray-600">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <strong>{client.name}</strong>? All their data, progress, and history will be permanently removed.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete?.(client.id);
                    setShowDeleteConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                >
                  Delete Client
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};