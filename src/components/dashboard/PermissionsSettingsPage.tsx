import React, { useState } from 'react';
import { Shield, Eye, Edit, Users, MessageSquare, Activity, Zap, Moon, Target, AlertTriangle, CheckCircle, Info, Lock, Unlock, Clock, User } from 'lucide-react';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

interface PermissionSetting {
  id: string;
  domain: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  level: 'none' | 'read' | 'edit' | 'full';
  lastChanged: Date;
  changedBy: 'client' | 'trainer';
  subPermissions?: {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
  }[];
}

interface PermissionAuditLog {
  id: string;
  domain: string;
  action: 'granted' | 'revoked' | 'modified';
  previousLevel: string;
  newLevel: string;
  timestamp: Date;
  changedBy: 'client' | 'trainer';
  reason?: string;
}

interface PermissionsSettingsPageProps {
  clientId: string;
  isTrainerView?: boolean;
  onPermissionChange?: (domain: string, level: string) => void;
}

export const PermissionsSettingsPage: React.FC<PermissionsSettingsPageProps> = ({
  clientId,
  isTrainerView = false,
  onPermissionChange
}) => {
  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
  const [permissions, setPermissions] = useState<PermissionSetting[]>([
    {
      id: 'workouts',
      domain: 'workouts',
      label: 'Workout Data',
      description: 'Exercise logs, workout plans, performance metrics, and training history',
      icon: Activity,
      level: 'edit',
      lastChanged: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      changedBy: 'client',
      subPermissions: [
        {
          id: 'workout_plans',
          label: 'Workout Plans',
          description: 'Create and modify workout routines',
          enabled: true
        },
        {
          id: 'exercise_history',
          label: 'Exercise History',
          description: 'View past workout sessions and progress',
          enabled: true
        },
        {
          id: 'performance_metrics',
          label: 'Performance Metrics',
          description: 'Access to PRs, volume, and strength data',
          enabled: true
        },
        {
          id: 'workout_scheduling',
          label: 'Workout Scheduling',
          description: 'Schedule and assign workout sessions',
          enabled: false
        }
      ]
    },
    {
      id: 'nutrition',
      domain: 'nutrition',
      label: 'Nutrition Data',
      description: 'Meal logs, macro tracking, nutrition goals, and dietary preferences',
      icon: Zap,
      level: 'read',
      lastChanged: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      changedBy: 'client',
      subPermissions: [
        {
          id: 'meal_logs',
          label: 'Meal Logs',
          description: 'View daily food intake and meal timing',
          enabled: true
        },
        {
          id: 'macro_targets',
          label: 'Macro Targets',
          description: 'Set and adjust macronutrient goals',
          enabled: false
        },
        {
          id: 'supplement_tracking',
          label: 'Supplement Tracking',
          description: 'Track supplement intake and timing',
          enabled: true
        },
        {
          id: 'meal_planning',
          label: 'Meal Planning',
          description: 'Create and assign meal plans',
          enabled: false
        }
      ]
    },
    {
      id: 'sleep',
      domain: 'sleep',
      label: 'Sleep & Recovery',
      description: 'Sleep patterns, recovery metrics, and rest day activities',
      icon: Moon,
      level: 'read',
      lastChanged: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      changedBy: 'client',
      subPermissions: [
        {
          id: 'sleep_data',
          label: 'Sleep Data',
          description: 'Sleep duration, quality, and patterns',
          enabled: true
        },
        {
          id: 'recovery_metrics',
          label: 'Recovery Metrics',
          description: 'HRV, resting heart rate, and recovery scores',
          enabled: true
        },
        {
          id: 'rest_recommendations',
          label: 'Rest Recommendations',
          description: 'Suggest recovery activities and rest periods',
          enabled: false
        }
      ]
    },
    {
      id: 'progress',
      domain: 'progress',
      label: 'Progress & Analytics',
      description: 'Body measurements, progress photos, goal tracking, and analytics',
      icon: Target,
      level: 'full',
      lastChanged: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      changedBy: 'client',
      subPermissions: [
        {
          id: 'body_measurements',
          label: 'Body Measurements',
          description: 'Weight, body fat, and circumference measurements',
          enabled: true
        },
        {
          id: 'progress_photos',
          label: 'Progress Photos',
          description: 'Before/after photos and visual progress tracking',
          enabled: true
        },
        {
          id: 'goal_setting',
          label: 'Goal Setting',
          description: 'Set and modify fitness and health goals',
          enabled: true
        },
        {
          id: 'analytics_reports',
          label: 'Analytics Reports',
          description: 'Generate detailed progress and performance reports',
          enabled: true
        }
      ]
    },
    {
      id: 'communication',
      domain: 'communication',
      label: 'Communication & Chat',
      description: 'Chat history, AI interactions, and communication preferences',
      icon: MessageSquare,
      level: 'edit',
      lastChanged: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      changedBy: 'client',
      subPermissions: [
        {
          id: 'chat_history',
          label: 'Chat History',
          description: 'Access to conversation logs and message history',
          enabled: true
        },
        {
          id: 'ai_interactions',
          label: 'AI Interactions',
          description: 'Pat AI conversation data and preferences',
          enabled: true
        },
        {
          id: 'communication_settings',
          label: 'Communication Settings',
          description: 'Modify notification and communication preferences',
          enabled: false
        }
      ]
    },
    {
      id: 'profile',
      domain: 'profile',
      label: 'Profile & Personal Data',
      description: 'Personal information, preferences, and account settings',
      icon: User,
      level: 'none',
      lastChanged: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      changedBy: 'client',
      subPermissions: [
        {
          id: 'basic_info',
          label: 'Basic Information',
          description: 'Name, age, contact information',
          enabled: false
        },
        {
          id: 'health_conditions',
          label: 'Health Conditions',
          description: 'Medical history and health conditions',
          enabled: false
        },
        {
          id: 'preferences',
          label: 'Preferences',
          description: 'App settings and personal preferences',
          enabled: false
        }
      ]
    }
  ]);

  const [auditLog, setAuditLog] = useState<PermissionAuditLog[]>([
    {
      id: '1',
      domain: 'progress',
      action: 'granted',
      previousLevel: 'edit',
      newLevel: 'full',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      changedBy: 'client',
      reason: 'Granted full access for comprehensive progress tracking'
    },
    {
      id: '2',
      domain: 'workouts',
      action: 'granted',
      previousLevel: 'read',
      newLevel: 'edit',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      changedBy: 'client',
      reason: 'Allowed trainer to modify workout plans'
    },
    {
      id: '3',
      domain: 'profile',
      action: 'revoked',
      previousLevel: 'read',
      newLevel: 'none',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      changedBy: 'client',
      reason: 'Restricted access to personal information'
    }
  ]);

  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<PermissionSetting | null>(null);

  const handlePermissionChange = (permissionId: string, newLevel: string) => {
    if (isTrainerView) {
      // Trainers can only view, not modify permissions
      return;
    }

    const permission = permissions.find(p => p.id === permissionId);
    if (!permission) return;

    // Create audit log entry
    const auditEntry: PermissionAuditLog = {
      id: Date.now().toString(),
      domain: permission.domain,
      action: newLevel === 'none' ? 'revoked' : permission.level === 'none' ? 'granted' : 'modified',
      previousLevel: permission.level,
      newLevel: newLevel as any,
      timestamp: new Date(),
      changedBy: 'client'
    };

    setAuditLog(prev => [auditEntry, ...prev]);

    // Update permission
    setPermissions(prev => prev.map(p => 
      p.id === permissionId 
        ? { ...p, level: newLevel as any, lastChanged: new Date(), changedBy: 'client' }
        : p
    ));

    onPermissionChange?.(permissionId, newLevel);

    // TODO: Save to backend
    console.log('Permission changed:', { permissionId, newLevel, auditEntry });
  };

  const handleSubPermissionToggle = (permissionId: string, subPermissionId: string) => {
    if (isTrainerView) return;

    setPermissions(prev => prev.map(p => 
      p.id === permissionId 
        ? {
            ...p,
            subPermissions: p.subPermissions?.map(sp =>
              sp.id === subPermissionId ? { ...sp, enabled: !sp.enabled } : sp
            ),
            lastChanged: new Date(),
            changedBy: 'client'
          }
        : p
    ));

    // TODO: Save to backend
    console.log('Sub-permission toggled:', { permissionId, subPermissionId });
  };

  const getPermissionIcon = (level: PermissionSetting['level']) => {
    switch (level) {
      case 'none':
        return <Lock size={16} className="text-red-500" />;
      case 'read':
        return <Eye size={16} className="text-blue-500" />;
      case 'edit':
        return <Edit size={16} className="text-green-500" />;
      case 'full':
        return <Unlock size={16} className="text-purple-500" />;
    }
  };

  const getPermissionColor = (level: PermissionSetting['level']) => {
    switch (level) {
      case 'none':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'read':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'edit':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'full':
        return 'bg-purple-50 border-purple-200 text-purple-800';
    }
  };

  const getActionIcon = (action: PermissionAuditLog['action']) => {
    switch (action) {
      case 'granted':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'revoked':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'modified':
        return <Info size={16} className="text-blue-500" />;
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  const permissionLevels = [
    { value: 'none', label: 'No Access', description: 'Trainer cannot access this data' },
    { value: 'read', label: 'View Only', description: 'Trainer can view but not modify' },
    { value: 'edit', label: 'View & Edit', description: 'Trainer can view and modify' },
    { value: 'full', label: 'Full Access', description: 'Complete access including advanced features' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ position: 'relative' }}>
      <DataSourceBadge source="mock" />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isTrainerView ? 'Client Data Permissions' : 'Data Sharing Permissions'}
              </h1>
              <p className="text-gray-600">
                {isTrainerView 
                  ? 'View what data your client has shared with you'
                  : 'Control what data you share with your trainer'
                }
              </p>
            </div>
          </div>

          {/* Permission Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-900">
                  {permissions.filter(p => p.level !== 'none').length}
                </div>
                <div className="text-sm text-blue-700">Domains Shared</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">
                  {permissions.filter(p => p.level === 'full').length}
                </div>
                <div className="text-sm text-green-700">Full Access</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-900">
                  {permissions.filter(p => p.level === 'edit').length}
                </div>
                <div className="text-sm text-yellow-700">Edit Access</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-900">
                  {permissions.filter(p => p.level === 'none').length}
                </div>
                <div className="text-sm text-red-700">Restricted</div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        {!isTrainerView && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-900 mb-1">Your Privacy is Protected</h3>
                <p className="text-yellow-800 text-sm leading-relaxed">
                  You have complete control over your data. You can change these permissions at any time, 
                  and your trainer will be notified of any changes. Your personal information is never 
                  shared without your explicit consent.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Permissions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {permissions.map((permission) => {
            const IconComponent = permission.icon;
            return (
              <div key={permission.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <IconComponent size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{permission.label}</h3>
                      <p className="text-gray-600 text-sm">{permission.description}</p>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getPermissionColor(permission.level)}`}>
                    {getPermissionIcon(permission.level)}
                    {permission.level === 'none' ? 'No Access' :
                     permission.level === 'read' ? 'View Only' :
                     permission.level === 'edit' ? 'View & Edit' :
                     'Full Access'}
                  </div>
                </div>

                {/* Permission Level Selector */}
                {!isTrainerView && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Access Level</label>
                    <select
                      value={permission.level}
                      onChange={(e) => handlePermissionChange(permission.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {permissionLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label} - {level.description}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sub-permissions */}
                {permission.subPermissions && permission.level !== 'none' && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Specific Permissions</h4>
                    {permission.subPermissions.map((subPerm) => (
                      <div key={subPerm.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{subPerm.label}</p>
                          <p className="text-xs text-gray-600">{subPerm.description}</p>
                        </div>
                        {!isTrainerView ? (
                          <button
                            onClick={() => handleSubPermissionToggle(permission.id, subPerm.id)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              subPerm.enabled ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                subPerm.enabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : (
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            subPerm.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {subPerm.enabled ? 'Enabled' : 'Disabled'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Last Changed Info */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Last changed {formatTimeAgo(permission.lastChanged)}</span>
                  </div>
                  <span>by {permission.changedBy}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Audit Log Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Permission History</h3>
              <button
                onClick={() => setShowAuditLog(!showAuditLog)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {showAuditLog ? 'Hide' : 'Show'} History
              </button>
            </div>
            <p className="text-gray-600 text-sm mt-1">
              Track all changes to your data sharing permissions
            </p>
          </div>

          {showAuditLog && (
            <div className="p-6">
              {auditLog.length === 0 ? (
                <div className="text-center py-8">
                  <Shield size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No permission changes yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        {getActionIcon(entry.action)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 capitalize">
                            {entry.action} {entry.domain} access
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(entry.timestamp)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          Changed from <span className="font-medium">{entry.previousLevel}</span> to{' '}
                          <span className="font-medium">{entry.newLevel}</span>
                        </p>
                        
                        {entry.reason && (
                          <p className="text-xs text-gray-500 italic">"{entry.reason}"</p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>Changed by {entry.changedBy}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900 mb-3">Understanding Permission Levels</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permissionLevels.map((level) => (
              <div key={level.value} className="flex items-start gap-3">
                {getPermissionIcon(level.value as any)}
                <div>
                  <p className="font-medium text-blue-900 text-sm">{level.label}</p>
                  <p className="text-blue-700 text-xs">{level.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TODO Comments */}
        <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Implementation TODOs</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h5 className="font-medium mb-2">Backend Requirements:</h5>
              <ul className="space-y-1 text-xs">
                <li>• Permission enforcement in all API endpoints</li>
                <li>• Real-time permission change notifications</li>
                <li>• Audit logging for compliance</li>
                <li>• Role-based access control (RBAC)</li>
                <li>• Data encryption and secure storage</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Features to Implement:</h5>
              <ul className="space-y-1 text-xs">
                <li>• Granular sub-permission controls</li>
                <li>• Temporary permission grants</li>
                <li>• Permission request workflow</li>
                <li>• Data export with permission filtering</li>
                <li>• Client onboarding permission setup</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};