import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Copy, Play, Pause, Calendar, Clock, Target, Activity, TrendingUp, CheckCircle, AlertTriangle, MoreVertical } from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string; // Can be "8-12" or "10" etc.
  weight?: string;
  restTime: number; // seconds
  notes?: string;
  muscleGroups: string[];
  equipment: string[];
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  type: 'strength' | 'cardio' | 'hybrid' | 'recovery';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // minutes
  exercises: Exercise[];
  isActive: boolean;
  isTemplate: boolean;
  createdAt: Date;
  lastUsed?: Date;
  completionRate?: number;
  assignedDays?: string[]; // ['monday', 'wednesday', 'friday']
  progressTracking: {
    totalSessions: number;
    avgRating: number;
    lastModified: Date;
  };
}

interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  type: WorkoutPlan['type'];
  difficulty: WorkoutPlan['difficulty'];
  exercises: Exercise[];
  tags: string[];
}

interface WorkoutPlansTabProps {
  clientId: string;
}

export const WorkoutPlansTab: React.FC<WorkoutPlansTabProps> = ({ clientId }) => {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([
    {
      id: '1',
      name: 'Upper Body Strength',
      description: 'Comprehensive upper body workout focusing on compound movements',
      type: 'strength',
      difficulty: 'intermediate',
      estimatedDuration: 75,
      exercises: [
        {
          id: '1',
          name: 'Bench Press',
          sets: 4,
          reps: '6-8',
          weight: '185 lbs',
          restTime: 180,
          notes: 'Focus on controlled eccentric',
          muscleGroups: ['chest', 'triceps', 'shoulders'],
          equipment: ['barbell', 'bench']
        },
        {
          id: '2',
          name: 'Pull-ups',
          sets: 3,
          reps: '8-12',
          restTime: 120,
          muscleGroups: ['back', 'biceps'],
          equipment: ['pull-up bar']
        },
        {
          id: '3',
          name: 'Overhead Press',
          sets: 3,
          reps: '8-10',
          weight: '135 lbs',
          restTime: 150,
          muscleGroups: ['shoulders', 'triceps'],
          equipment: ['barbell']
        }
      ],
      isActive: true,
      isTemplate: false,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completionRate: 92,
      assignedDays: ['monday', 'thursday'],
      progressTracking: {
        totalSessions: 8,
        avgRating: 4.2,
        lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    },
    {
      id: '2',
      name: 'Lower Body Power',
      description: 'Explosive lower body movements for strength and power development',
      type: 'strength',
      difficulty: 'advanced',
      estimatedDuration: 90,
      exercises: [
        {
          id: '4',
          name: 'Back Squat',
          sets: 5,
          reps: '3-5',
          weight: '275 lbs',
          restTime: 240,
          notes: 'Focus on depth and speed out of the hole',
          muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
          equipment: ['barbell', 'squat rack']
        },
        {
          id: '5',
          name: 'Romanian Deadlift',
          sets: 4,
          reps: '6-8',
          weight: '225 lbs',
          restTime: 180,
          muscleGroups: ['hamstrings', 'glutes', 'lower back'],
          equipment: ['barbell']
        }
      ],
      isActive: true,
      isTemplate: false,
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      completionRate: 88,
      assignedDays: ['tuesday', 'friday'],
      progressTracking: {
        totalSessions: 6,
        avgRating: 4.5,
        lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    },
    {
      id: '3',
      name: 'Active Recovery',
      description: 'Light movement and mobility work for recovery days',
      type: 'recovery',
      difficulty: 'beginner',
      estimatedDuration: 30,
      exercises: [
        {
          id: '6',
          name: 'Walking',
          sets: 1,
          reps: '20 min',
          restTime: 0,
          notes: 'Moderate pace, focus on breathing',
          muscleGroups: ['full body'],
          equipment: ['none']
        },
        {
          id: '7',
          name: 'Dynamic Stretching',
          sets: 1,
          reps: '10 min',
          restTime: 0,
          muscleGroups: ['full body'],
          equipment: ['none']
        }
      ],
      isActive: false,
      isTemplate: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastUsed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completionRate: 75,
      assignedDays: ['sunday'],
      progressTracking: {
        totalSessions: 4,
        avgRating: 3.8,
        lastModified: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | WorkoutPlan['type']>('all');

  // Mock workout templates
  const workoutTemplates: WorkoutTemplate[] = [
    {
      id: 'template-1',
      name: 'Push Day',
      description: 'Chest, shoulders, and triceps focused workout',
      type: 'strength',
      difficulty: 'intermediate',
      exercises: [
        {
          id: 't1',
          name: 'Bench Press',
          sets: 4,
          reps: '6-8',
          restTime: 180,
          muscleGroups: ['chest', 'triceps', 'shoulders'],
          equipment: ['barbell', 'bench']
        },
        {
          id: 't2',
          name: 'Overhead Press',
          sets: 3,
          reps: '8-10',
          restTime: 150,
          muscleGroups: ['shoulders', 'triceps'],
          equipment: ['barbell']
        },
        {
          id: 't3',
          name: 'Dips',
          sets: 3,
          reps: '10-15',
          restTime: 120,
          muscleGroups: ['triceps', 'chest'],
          equipment: ['dip bars']
        }
      ],
      tags: ['push', 'upper body', 'strength']
    },
    {
      id: 'template-2',
      name: 'Pull Day',
      description: 'Back and biceps focused workout',
      type: 'strength',
      difficulty: 'intermediate',
      exercises: [
        {
          id: 't4',
          name: 'Deadlift',
          sets: 4,
          reps: '5-6',
          restTime: 240,
          muscleGroups: ['back', 'hamstrings', 'glutes'],
          equipment: ['barbell']
        },
        {
          id: 't5',
          name: 'Pull-ups',
          sets: 3,
          reps: '8-12',
          restTime: 120,
          muscleGroups: ['back', 'biceps'],
          equipment: ['pull-up bar']
        },
        {
          id: 't6',
          name: 'Barbell Rows',
          sets: 3,
          reps: '8-10',
          restTime: 150,
          muscleGroups: ['back', 'biceps'],
          equipment: ['barbell']
        }
      ],
      tags: ['pull', 'upper body', 'strength']
    }
  ];

  const [newPlan, setNewPlan] = useState<Partial<WorkoutPlan>>({
    name: '',
    description: '',
    type: 'strength',
    difficulty: 'intermediate',
    estimatedDuration: 60,
    exercises: [],
    isActive: true,
    isTemplate: false,
    assignedDays: []
  });

  const handleCreatePlan = () => {
    if (!newPlan.name || !newPlan.exercises?.length) return;

    const plan: WorkoutPlan = {
      id: Date.now().toString(),
      name: newPlan.name,
      description: newPlan.description || '',
      type: newPlan.type as WorkoutPlan['type'],
      difficulty: newPlan.difficulty as WorkoutPlan['difficulty'],
      estimatedDuration: newPlan.estimatedDuration || 60,
      exercises: newPlan.exercises,
      isActive: newPlan.isActive ?? true,
      isTemplate: false,
      createdAt: new Date(),
      assignedDays: newPlan.assignedDays || [],
      progressTracking: {
        totalSessions: 0,
        avgRating: 0,
        lastModified: new Date()
      }
    };

    setWorkoutPlans(prev => [plan, ...prev]);
    setNewPlan({
      name: '',
      description: '',
      type: 'strength',
      difficulty: 'intermediate',
      estimatedDuration: 60,
      exercises: [],
      isActive: true,
      isTemplate: false,
      assignedDays: []
    });
    setShowCreateModal(false);

    // TODO: Save to backend
    console.log('Created workout plan:', plan);
  };

  const handleUpdatePlan = (updatedPlan: WorkoutPlan) => {
    setWorkoutPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    setEditingPlan(null);
    // TODO: Update in backend
    console.log('Updated workout plan:', updatedPlan);
  };

  const handleDeletePlan = (planId: string) => {
    setWorkoutPlans(prev => prev.filter(p => p.id !== planId));
    // TODO: Delete from backend
    console.log('Deleted workout plan:', planId);
  };

  const handleTogglePlan = (planId: string) => {
    setWorkoutPlans(prev => prev.map(p => 
      p.id === planId ? { ...p, isActive: !p.isActive } : p
    ));
    // TODO: Update in backend
  };

  const handleDuplicatePlan = (plan: WorkoutPlan) => {
    const duplicatedPlan: WorkoutPlan = {
      ...plan,
      id: Date.now().toString(),
      name: `${plan.name} (Copy)`,
      createdAt: new Date(),
      lastUsed: undefined,
      progressTracking: {
        totalSessions: 0,
        avgRating: 0,
        lastModified: new Date()
      }
    };

    setWorkoutPlans(prev => [duplicatedPlan, ...prev]);
    // TODO: Save to backend
    console.log('Duplicated workout plan:', duplicatedPlan);
  };

  const handleUseTemplate = (template: WorkoutTemplate) => {
    setNewPlan({
      name: template.name,
      description: template.description,
      type: template.type,
      difficulty: template.difficulty,
      estimatedDuration: template.exercises.length * 15, // Rough estimate
      exercises: template.exercises,
      isActive: true,
      isTemplate: false,
      assignedDays: []
    });
  };

  const getTypeIcon = (type: WorkoutPlan['type']) => {
    switch (type) {
      case 'strength':
        return <Activity size={16} className="text-orange-500" />;
      case 'cardio':
        return <TrendingUp size={16} className="text-red-500" />;
      case 'hybrid':
        return <Target size={16} className="text-purple-500" />;
      case 'recovery':
        return <Clock size={16} className="text-blue-500" />;
    }
  };

  const getDifficultyColor = (difficulty: WorkoutPlan['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getCompletionRateColor = (rate?: number) => {
    if (!rate) return 'text-gray-400';
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const filteredPlans = filterType === 'all' 
    ? workoutPlans 
    : workoutPlans.filter(p => p.type === filterType);

  const activePlans = workoutPlans.filter(p => p.isActive).length;
  const avgCompletionRate = workoutPlans.reduce((sum, p) => sum + (p.completionRate || 0), 0) / workoutPlans.length;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Workout Plans</h3>
          <div className="flex items-center gap-6 text-sm text-gray-600 mt-1">
            <span>{workoutPlans.length} total plans</span>
            <span>{activePlans} active</span>
            <span>{Math.round(avgCompletionRate)}% avg completion</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
                <div className="bg-current rounded-sm"></div>
              </div>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            >
              <div className="w-4 h-4 flex flex-col gap-0.5">
                <div className="bg-current h-0.5 rounded-sm"></div>
                <div className="bg-current h-0.5 rounded-sm"></div>
                <div className="bg-current h-0.5 rounded-sm"></div>
                <div className="bg-current h-0.5 rounded-sm"></div>
              </div>
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            New Plan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="strength">Strength</option>
          <option value="cardio">Cardio</option>
          <option value="hybrid">Hybrid</option>
          <option value="recovery">Recovery</option>
        </select>
      </div>

      {/* Workout Plans */}
      {filteredPlans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Activity size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No workout plans found</h3>
          <p className="text-gray-600 mb-6">
            {filterType === 'all' 
              ? 'Create your first workout plan to get started'
              : `No ${filterType} workout plans found`
            }
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            Create Workout Plan
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div key={plan.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getTypeIcon(plan.type)}
                  <h4 className="font-medium text-gray-900">{plan.name}</h4>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPlan(plan);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit3 size={14} className="text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicatePlan(plan);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Copy size={14} className="text-gray-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(plan.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{plan.description}</p>

              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(plan.difficulty)}`}>
                  {plan.difficulty}
                </span>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {plan.isActive ? <CheckCircle size={12} /> : <Pause size={12} />}
                  {plan.isActive ? 'Active' : 'Paused'}
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium">{formatDuration(plan.estimatedDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exercises:</span>
                  <span className="font-medium">{plan.exercises.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sessions:</span>
                  <span className="font-medium">{plan.progressTracking.totalSessions}</span>
                </div>
                {plan.completionRate && (
                  <div className="flex justify-between">
                    <span>Completion:</span>
                    <span className={`font-medium ${getCompletionRateColor(plan.completionRate)}`}>
                      {typeof tag === 'string' ? tag : ''}
                    </span>
                  </div>
                )}
              </div>

              {plan.assignedDays && plan.assignedDays.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>Assigned: {plan.assignedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}</span>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePlan(plan.id);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    plan.isActive
                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {plan.isActive ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exercises</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{plan.name}</div>
                        <div className="text-sm text-gray-600">{plan.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(plan.type)}
                        <span className="capitalize">{plan.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDuration(plan.estimatedDuration)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {plan.exercises.length}
                    </td>
                    <td className="px-6 py-4">
                      {plan.completionRate ? (
                        <span className={`font-medium ${getCompletionRateColor(plan.completionRate)}`}>
                          {plan.completionRate}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        plan.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.isActive ? <CheckCircle size={12} /> : <Pause size={12} />}
                        {plan.isActive ? 'Active' : 'Paused'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditingPlan(plan)}
                          className="text-gray-600 hover:text-gray-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleTogglePlan(plan.id)}
                          className="text-gray-600 hover:text-gray-700 text-sm"
                        >
                          {plan.isActive ? 'Pause' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPlan) && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => {
            setShowCreateModal(false);
            setEditingPlan(null);
          }} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPlan ? 'Edit Workout Plan' : 'Create New Workout Plan'}
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Design a comprehensive workout routine for your client
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Templates (only for new plans) */}
              {!editingPlan && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Quick Start Templates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {workoutTemplates.map((template) => (
                      <button // eslint-disable-next-line react/jsx-key
                        key={template.id}
                        onClick={() => handleUseTemplate(template)}
                        className="p-4 text-left border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(template.type)}
                          <span className="font-medium text-gray-900">{template.name}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(template.difficulty)}`}>
                            {template.difficulty}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{template.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan Name</label>
                  <input
                    type="text"
                    value={editingPlan?.name || newPlan.name}
                    onChange={(e) => editingPlan 
                      ? setEditingPlan({ ...editingPlan, name: e.target.value })
                      : setNewPlan({ ...newPlan, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Upper Body Strength"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={editingPlan?.type || newPlan.type}
                    onChange={(e) => editingPlan
                      ? setEditingPlan({ ...editingPlan, type: e.target.value as WorkoutPlan['type'] })
                      : setNewPlan({ ...newPlan, type: e.target.value as WorkoutPlan['type'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="strength">Strength</option>
                    <option value="cardio">Cardio</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="recovery">Recovery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                  <select
                    value={editingPlan?.difficulty || newPlan.difficulty}
                    onChange={(e) => editingPlan
                      ? setEditingPlan({ ...editingPlan, difficulty: e.target.value as WorkoutPlan['difficulty'] })
                      : setNewPlan({ ...newPlan, difficulty: e.target.value as WorkoutPlan['difficulty'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration (minutes)</label>
                  <input
                    type="number"
                    value={editingPlan?.estimatedDuration || newPlan.estimatedDuration}
                    onChange={(e) => editingPlan
                      ? setEditingPlan({ ...editingPlan, estimatedDuration: parseInt(e.target.value) })
                      : setNewPlan({ ...newPlan, estimatedDuration: parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="15"
                    max="180"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingPlan?.description || newPlan.description}
                  onChange={(e) => editingPlan
                    ? setEditingPlan({ ...editingPlan, description: e.target.value })
                    : setNewPlan({ ...newPlan, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe the workout plan and its goals..."
                />
              </div>

              {/* Assigned Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Days</label>
                <div className="grid grid-cols-7 gap-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <label key={day} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(editingPlan?.assignedDays || newPlan.assignedDays || []).includes(day)}
                        onChange={(e) => {
                          const currentDays = editingPlan?.assignedDays || newPlan.assignedDays || [];
                          const newDays = e.target.checked
                            ? [...currentDays, day]
                            : currentDays.filter(d => d !== day);
                          
                          if (editingPlan) {
                            setEditingPlan({ ...editingPlan, assignedDays: newDays });
                          } else {
                            setNewPlan({ ...newPlan, assignedDays: newDays });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Exercise List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Exercises</h4>
                  <button
                    onClick={() => {
                      const newExercise: Exercise = {
                        id: Date.now().toString(),
                        name: '',
                        sets: 3,
                        reps: '8-12',
                        restTime: 120,
                        muscleGroups: [],
                        equipment: []
                      };
                      
                      if (editingPlan) {
                        setEditingPlan({ ...editingPlan, exercises: [...editingPlan.exercises, newExercise] });
                      } else {
                        setNewPlan({ ...newPlan, exercises: [...(newPlan.exercises || []), newExercise] });
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                  >
                    <Plus size={14} />
                    Add Exercise
                  </button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {(editingPlan?.exercises || newPlan.exercises || []).map((exercise, index) => (
                    <div key={exercise.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                          type="text"
                          value={exercise.name}
                          onChange={(e) => {
                            const updatedExercises = (editingPlan?.exercises || newPlan.exercises || []).map((ex, i) =>
                              i === index ? { ...ex, name: e.target.value } : ex
                            );
                            
                            if (editingPlan) {
                              setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                            } else {
                              setNewPlan({ ...newPlan, exercises: updatedExercises });
                            }
                          }}
                          placeholder="Exercise name"
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        <input
                          type="number"
                          value={exercise.sets}
                          onChange={(e) => {
                            const updatedExercises = (editingPlan?.exercises || newPlan.exercises || []).map((ex, i) =>
                              i === index ? { ...ex, sets: parseInt(e.target.value) } : ex
                            );
                            
                            if (editingPlan) {
                              setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                            } else {
                              setNewPlan({ ...newPlan, exercises: updatedExercises });
                            }
                          }}
                          placeholder="Sets"
                          min="1"
                          max="10"
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        <input
                          type="text"
                          value={exercise.reps}
                          onChange={(e) => {
                            const updatedExercises = (editingPlan?.exercises || newPlan.exercises || []).map((ex, i) =>
                              i === index ? { ...ex, reps: e.target.value } : ex
                            );
                            
                            if (editingPlan) {
                              setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                            } else {
                              setNewPlan({ ...newPlan, exercises: updatedExercises });
                            }
                          }}
                          placeholder="Reps (e.g., 8-12)"
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={exercise.restTime}
                            onChange={(e) => {
                              const updatedExercises = (editingPlan?.exercises || newPlan.exercises || []).map((ex, i) =>
                                i === index ? { ...ex, restTime: parseInt(e.target.value) } : ex
                              );
                              
                              if (editingPlan) {
                                setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                              } else {
                                setNewPlan({ ...newPlan, exercises: updatedExercises });
                              }
                            }}
                            placeholder="Rest (sec)"
                            min="30"
                            max="600"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          
                          <button
                            onClick={() => {
                              const updatedExercises = (editingPlan?.exercises || newPlan.exercises || []).filter((_, i) => i !== index);
                              
                              if (editingPlan) {
                                setEditingPlan({ ...editingPlan, exercises: updatedExercises });
                              } else {
                                setNewPlan({ ...newPlan, exercises: updatedExercises });
                              }
                            }}
                            className="p-2 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPlan(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => editingPlan 
                  ? handleUpdatePlan(editingPlan)
                  : handleCreatePlan()
                }
                disabled={!(editingPlan?.name || newPlan.name) || !(editingPlan?.exercises?.length || newPlan.exercises?.length)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {editingPlan ? 'Update' : 'Create'} Plan
              </button>
            </div>
          </div>
        </>
      )}

      {/* Plan Detail Modal */}
      {selectedPlan && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setSelectedPlan(null)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedPlan.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{selectedPlan.description}</p>
                </div>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Plan Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{formatDuration(selectedPlan.estimatedDuration)}</div>
                  <div className="text-sm text-gray-600">Duration</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{selectedPlan.exercises.length}</div>
                  <div className="text-sm text-gray-600">Exercises</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{selectedPlan.progressTracking.totalSessions}</div>
                  <div className="text-sm text-gray-600">Sessions</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getCompletionRateColor(selectedPlan.completionRate)}`}>
                    {selectedPlan.completionRate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Completion</div>
                </div>
              </div>

              {/* Exercises */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Exercises</h4>
                <div className="space-y-3">
                  {selectedPlan.exercises.map((exercise, index) => (
                    <div key={exercise.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{exercise.name}</h5>
                        <span className="text-sm text-gray-600">
                          {exercise.sets} × {exercise.reps}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        {exercise.weight && (
                          <div>
                            <span className="font-medium">Weight:</span> {exercise.weight}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Rest:</span> {exercise.restTime}s
                        </div>
                        {exercise.muscleGroups.length > 0 && (
                          <div>
                            <span className="font-medium">Muscles:</span> {exercise.muscleGroups.join(', ')}
                          </div>
                        )}
                        {exercise.equipment.length > 0 && (
                          <div>
                            <span className="font-medium">Equipment:</span> {exercise.equipment.join(', ')}
                          </div>
                        )}
                      </div>
                      
                      {exercise.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Notes:</span> {exercise.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TODO Comments */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="font-medium text-green-900 mb-3">Workout Plans Integration TODOs</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-800">
          <div>
            <h5 className="font-medium mb-2">Backend Requirements:</h5>
            <ul className="space-y-1 text-xs">
              <li>• Workout plan CRUD operations</li>
              <li>• Exercise database integration</li>
              <li>• Progress tracking and analytics</li>
              <li>• Plan scheduling and assignment</li>
              <li>• Performance metrics calculation</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Features to Implement:</h5>
            <ul className="space-y-1 text-xs">
              <li>• Drag-and-drop exercise ordering</li>
              <li>• Exercise video/image integration</li>
              <li>• Progressive overload suggestions</li>
              <li>• Plan sharing and templates</li>
              <li>• Real-time workout tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};