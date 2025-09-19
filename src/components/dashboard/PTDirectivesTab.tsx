import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Eye, MessageSquare, Clock, Target, Zap, Moon, Activity, AlertTriangle, CheckCircle, Play, Pause, MoreVertical } from 'lucide-react';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

interface PTDirective {
  id: string;
  title: string;
  description: string;
  category: 'nutrition' | 'workout' | 'recovery' | 'motivation' | 'general';
  priority: 'high' | 'medium' | 'low';
  frequency: 'daily' | 'weekly' | 'workout_days' | 'rest_days' | 'as_needed';
  triggers: string[];
  patInstructions: string;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  effectiveness?: number;
}

interface DirectiveTemplate {
  id: string;
  title: string;
  description: string;
  category: PTDirective['category'];
  defaultInstructions: string;
  commonTriggers: string[];
}

interface PTDirectivesTabProps {
  clientId: string;
}

export const PTDirectivesTab: React.FC<PTDirectivesTabProps> = ({ clientId }) => {
  const [directives, setDirectives] = useState<PTDirective[]>([
    // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
    {
      id: '1',
      title: 'Post-Workout Protein Reminder',
      description: 'Remind client to consume protein within 30 minutes after workouts',
      category: 'nutrition',
      priority: 'high',
      frequency: 'workout_days',
      triggers: ['workout_completed', 'high_intensity_session'],
      patInstructions: 'Remind the client to have their protein shake or meal within 30 minutes. Emphasize the importance for recovery and muscle protein synthesis.',
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lastTriggered: new Date(Date.now() - 2 * 60 * 60 * 1000),
      triggerCount: 12,
      effectiveness: 85
    },
    {
      id: '2',
      title: 'Sleep Optimization Nudge',
      description: 'Encourage better sleep habits when sleep quality drops',
      category: 'recovery',
      priority: 'medium',
      frequency: 'as_needed',
      triggers: ['poor_sleep_quality', 'late_bedtime', 'insufficient_sleep'],
      patInstructions: 'When sleep quality is below 75% or duration is under 7 hours, suggest specific sleep hygiene improvements. Be supportive and offer practical tips.',
      isActive: true,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      lastTriggered: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      triggerCount: 8,
      effectiveness: 72
    },
    {
      id: '3',
      title: 'Consistency Celebration',
      description: 'Celebrate workout streaks and consistency milestones',
      category: 'motivation',
      priority: 'medium',
      frequency: 'as_needed',
      triggers: ['workout_streak_milestone', 'weekly_goal_achieved'],
      patInstructions: 'Celebrate their achievement enthusiastically! Mention the specific milestone and encourage them to keep the momentum going. Set the next mini-goal.',
      isActive: true,
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      lastTriggered: new Date(Date.now() - 12 * 60 * 60 * 1000),
      triggerCount: 5,
      effectiveness: 94
    },
    {
      id: '4',
      title: 'Form Check Reminder',
      description: 'Remind about proper form during compound movements',
      category: 'workout',
      priority: 'high',
      frequency: 'workout_days',
      triggers: ['compound_movement', 'heavy_lifting_day'],
      patInstructions: 'Remind them to focus on form over weight. Suggest they record a set if they want feedback. Emphasize safety and long-term progress.',
      isActive: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastTriggered: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      triggerCount: 15,
      effectiveness: 78
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDirective, setEditingDirective] = useState<PTDirective | null>(null);
  const [previewDirective, setPreviewDirective] = useState<PTDirective | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock directive templates
  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
  const directiveTemplates: DirectiveTemplate[] = [
    {
      id: 'hydration',
      title: 'Hydration Reminder',
      description: 'Remind client to stay hydrated throughout the day',
      category: 'general',
      defaultInstructions: 'Remind the client to drink water regularly, especially before, during, and after workouts. Aim for clear or light yellow urine as a hydration indicator.',
      commonTriggers: ['workout_started', 'hot_weather', 'low_water_intake']
    },
    {
      id: 'rest_day_activity',
      title: 'Active Recovery Suggestion',
      description: 'Suggest light activities on rest days',
      category: 'recovery',
      defaultInstructions: 'Suggest light activities like walking, stretching, or yoga. Emphasize that rest days are for recovery, not complete inactivity.',
      commonTriggers: ['rest_day', 'high_soreness', 'consecutive_workouts']
    },
    {
      id: 'meal_prep',
      title: 'Meal Prep Encouragement',
      description: 'Encourage meal preparation for better nutrition adherence',
      category: 'nutrition',
      defaultInstructions: 'Suggest meal prep strategies to improve nutrition consistency. Offer simple, time-efficient meal ideas that align with their goals.',
      commonTriggers: ['poor_nutrition_day', 'weekend_approaching', 'busy_schedule']
    },
    {
      id: 'progress_photo',
      title: 'Progress Photo Reminder',
      description: 'Remind client to take progress photos',
      category: 'general',
      defaultInstructions: 'Remind them to take progress photos in consistent lighting and poses. Explain how photos can show changes that the scale might not reflect.',
      commonTriggers: ['monthly_milestone', 'weight_plateau', 'goal_checkpoint']
    }
  ];

  const [newDirective, setNewDirective] = useState<Partial<PTDirective>>({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    frequency: 'as_needed',
    triggers: [],
    patInstructions: '',
    isActive: true
  });

  const availableTriggers = [
    'workout_completed',
    'workout_started',
    'high_intensity_session',
    'poor_sleep_quality',
    'late_bedtime',
    'insufficient_sleep',
    'workout_streak_milestone',
    'weekly_goal_achieved',
    'compound_movement',
    'heavy_lifting_day',
    'rest_day',
    'high_soreness',
    'poor_nutrition_day',
    'low_water_intake',
    'weight_plateau',
    'goal_checkpoint',
    'missed_workout',
    'low_motivation',
    'high_stress'
  ];

  const handleCreateDirective = () => {
    if (!newDirective.title || !newDirective.patInstructions) return;

    const directive: PTDirective = {
      id: Date.now().toString(),
      title: newDirective.title,
      description: newDirective.description || '',
      category: newDirective.category as PTDirective['category'],
      priority: newDirective.priority as PTDirective['priority'],
      frequency: newDirective.frequency as PTDirective['frequency'],
      triggers: newDirective.triggers || [],
      patInstructions: newDirective.patInstructions,
      isActive: newDirective.isActive ?? true,
      createdAt: new Date(),
      triggerCount: 0
    };

    setDirectives(prev => [directive, ...prev]);
    setNewDirective({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      frequency: 'as_needed',
      triggers: [],
      patInstructions: '',
      isActive: true
    });
    setShowCreateModal(false);

    // TODO: Save to backend
    console.log('Created directive:', directive);
  };

  const handleUpdateDirective = (updatedDirective: PTDirective) => {
    setDirectives(prev => prev.map(d => d.id === updatedDirective.id ? updatedDirective : d));
    setEditingDirective(null);
    // TODO: Update in backend
    console.log('Updated directive:', updatedDirective);
  };

  const handleDeleteDirective = (directiveId: string) => {
    setDirectives(prev => prev.filter(d => d.id !== directiveId));
    // TODO: Delete from backend
    console.log('Deleted directive:', directiveId);
  };

  const handleToggleDirective = (directiveId: string) => {
    setDirectives(prev => prev.map(d => 
      d.id === directiveId ? { ...d, isActive: !d.isActive } : d
    ));
    // TODO: Update in backend
  };

  const handleUseTemplate = (template: DirectiveTemplate) => {
    setNewDirective({
      title: template.title,
      description: template.description,
      category: template.category,
      priority: 'medium',
      frequency: 'as_needed',
      triggers: template.commonTriggers.slice(0, 2),
      patInstructions: template.defaultInstructions,
      isActive: true
    });
  };

  const generatePreviewText = (directive: PTDirective): string => {
    const triggerText = directive.triggers.length > 0 
      ? `When ${directive.triggers.join(' or ')} occurs, ` 
      : 'When appropriate, ';
    
    return `${triggerText}Pat will ${directive.patInstructions.toLowerCase()}`;
  };

  const getCategoryIcon = (category: PTDirective['category']) => {
    switch (category) {
      case 'nutrition':
        return <Zap size={16} className="text-green-500" />;
      case 'workout':
        return <Activity size={16} className="text-orange-500" />;
      case 'recovery':
        return <Moon size={16} className="text-indigo-500" />;
      case 'motivation':
        return <Target size={16} className="text-purple-500" />;
      case 'general':
        return <MessageSquare size={16} className="text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: PTDirective['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEffectivenessColor = (effectiveness?: number) => {
    if (!effectiveness) return 'text-gray-400';
    if (effectiveness >= 80) return 'text-green-600';
    if (effectiveness >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredDirectives = selectedCategory === 'all' 
    ? directives 
    : directives.filter(d => d.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All Categories', count: directives.length },
    { id: 'nutrition', label: 'Nutrition', count: directives.filter(d => d.category === 'nutrition').length },
    { id: 'workout', label: 'Workout', count: directives.filter(d => d.category === 'workout').length },
    { id: 'recovery', label: 'Recovery', count: directives.filter(d => d.category === 'recovery').length },
    { id: 'motivation', label: 'Motivation', count: directives.filter(d => d.category === 'motivation').length },
    { id: 'general', label: 'General', count: directives.filter(d => d.category === 'general').length }
  ];

  return (
    <div className="space-y-6" style={{ position: 'relative' }}>
      <DataSourceBadge source="mock" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">PT Directives</h3>
          <p className="text-gray-600 text-sm">Configure how Pat interacts with your client</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          <Plus size={16} />
          New Directive
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.label} ({category.count})
          </button>
        ))}
      </div>

      {/* Directives List */}
      <div className="space-y-4">
        {filteredDirectives.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <MessageSquare size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No directives found</h3>
            <p className="text-gray-600 mb-6">
              {selectedCategory === 'all' 
                ? 'Create your first directive to guide Pat\'s interactions with your client'
                : `No directives in the ${selectedCategory} category`
              }
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Create Directive
            </button>
          </div>
        ) : (
          filteredDirectives.map((directive) => (
            <div key={directive.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getCategoryIcon(directive.category)}
                    <h4 className="font-medium text-gray-900">{directive.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(directive.priority)}`}>
                      {directive.priority}
                    </span>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      directive.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {directive.isActive ? <CheckCircle size={12} /> : <Pause size={12} />}
                      {directive.isActive ? 'Active' : 'Paused'}
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3">{directive.description}</p>
                  
                  {/* Triggers */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {directive.triggers.map((trigger, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {trigger.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>Triggered {directive.triggerCount} times</span>
                    </div>
                    {directive.lastTriggered && (
                      <div className="flex items-center gap-1">
                        <Activity size={14} />
                        <span>Last: {directive.lastTriggered.toLocaleDateString()}</span>
                      </div>
                    )}
                    {directive.effectiveness && (
                      <div className="flex items-center gap-1">
                        <Target size={14} />
                        <span className={getEffectivenessColor(directive.effectiveness)}>
                          {directive.effectiveness}% effective
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewDirective(directive)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <Eye size={16} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => setEditingDirective(directive)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={16} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleToggleDirective(directive.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={directive.isActive ? 'Pause' : 'Activate'}
                  >
                    {directive.isActive ? (
                      <Pause size={16} className="text-gray-400" />
                    ) : (
                      <Play size={16} className="text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteDirective(directive.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingDirective) && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => {
            setShowCreateModal(false);
            setEditingDirective(null);
          }} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDirective ? 'Edit Directive' : 'Create New Directive'}
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Configure how Pat should interact with your client in specific situations
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Templates (only for new directives) */}
              {!editingDirective && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Quick Start Templates</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {directiveTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleUseTemplate(template)}
                        className="p-3 text-left border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {getCategoryIcon(template.category)}
                          <span className="font-medium text-gray-900 text-sm">{template.title}</span>
                        </div>
                        <p className="text-gray-600 text-xs">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={editingDirective?.title || newDirective.title}
                    onChange={(e) => editingDirective 
                      ? setEditingDirective({ ...editingDirective, title: e.target.value })
                      : setNewDirective({ ...newDirective, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Post-Workout Protein Reminder"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={editingDirective?.category || newDirective.category}
                    onChange={(e) => editingDirective
                      ? setEditingDirective({ ...editingDirective, category: e.target.value as PTDirective['category'] })
                      : setNewDirective({ ...newDirective, category: e.target.value as PTDirective['category'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="nutrition">Nutrition</option>
                    <option value="workout">Workout</option>
                    <option value="recovery">Recovery</option>
                    <option value="motivation">Motivation</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={editingDirective?.priority || newDirective.priority}
                    onChange={(e) => editingDirective
                      ? setEditingDirective({ ...editingDirective, priority: e.target.value as PTDirective['priority'] })
                      : setNewDirective({ ...newDirective, priority: e.target.value as PTDirective['priority'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <select
                    value={editingDirective?.frequency || newDirective.frequency}
                    onChange={(e) => editingDirective
                      ? setEditingDirective({ ...editingDirective, frequency: e.target.value as PTDirective['frequency'] })
                      : setNewDirective({ ...newDirective, frequency: e.target.value as PTDirective['frequency'] })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="workout_days">Workout Days</option>
                    <option value="rest_days">Rest Days</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingDirective?.description || newDirective.description}
                  onChange={(e) => editingDirective
                    ? setEditingDirective({ ...editingDirective, description: e.target.value })
                    : setNewDirective({ ...newDirective, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Brief description of what this directive does"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Triggers</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {availableTriggers.map((trigger) => (
                    <label key={trigger} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(editingDirective?.triggers || newDirective.triggers || []).includes(trigger)}
                        onChange={(e) => {
                          const currentTriggers = editingDirective?.triggers || newDirective.triggers || [];
                          const newTriggers = e.target.checked
                            ? [...currentTriggers, trigger]
                            : currentTriggers.filter(t => t !== trigger);
                          
                          if (editingDirective) {
                            setEditingDirective({ ...editingDirective, triggers: newTriggers });
                          } else {
                            setNewDirective({ ...newDirective, triggers: newTriggers });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{trigger.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pat's Instructions
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={editingDirective?.patInstructions || newDirective.patInstructions}
                  onChange={(e) => editingDirective
                    ? setEditingDirective({ ...editingDirective, patInstructions: e.target.value })
                    : setNewDirective({ ...newDirective, patInstructions: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Detailed instructions for how Pat should respond when this directive is triggered..."
                />
              </div>

              {/* Preview */}
              {(editingDirective?.patInstructions || newDirective.patInstructions) && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h5 className="font-medium text-blue-900 mb-2">Preview</h5>
                  <p className="text-blue-800 text-sm italic">
                    "{generatePreviewText(editingDirective || newDirective as PTDirective)}"
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingDirective(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => editingDirective 
                  ? handleUpdateDirective(editingDirective)
                  : handleCreateDirective()
                }
                disabled={!(editingDirective?.patInstructions || newDirective.patInstructions)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {editingDirective ? 'Update' : 'Create'} Directive
              </button>
            </div>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewDirective && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setPreviewDirective(null)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Directive Preview</h3>
              <p className="text-gray-600 text-sm mt-1">How Pat will behave with this directive</p>
            </div>

            <div className="p-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={16} className="text-blue-600" />
                  <span className="font-medium text-blue-900">Pat says:</span>
                </div>
                <p className="text-blue-800 italic">
                  "{generatePreviewText(previewDirective)}"
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium capitalize">{previewDirective.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Priority:</span>
                  <span className={`font-medium capitalize ${
                    previewDirective.priority === 'high' ? 'text-red-600' :
                    previewDirective.priority === 'medium' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {previewDirective.priority}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frequency:</span>
                  <span className="font-medium">{typeof previewDirective.frequency === 'string' ? previewDirective.frequency.replace('_', ' ') : previewDirective.frequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Triggers:</span>
                  <span className="font-medium">{previewDirective.triggers.length} configured</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setPreviewDirective(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {/* TODO Comments */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h4 className="font-medium text-orange-900 mb-3">PT Directives Integration TODOs</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-orange-800">
          <div>
            <h5 className="font-medium mb-2">Backend Requirements:</h5>
            <ul className="space-y-1 text-xs">
              <li>• Trigger detection system</li>
              <li>• Directive execution engine</li>
              <li>• Effectiveness tracking</li>
              <li>• Natural language processing for instructions</li>
              <li>• Integration with conversation agents</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Features to Implement:</h5>
            <ul className="space-y-1 text-xs">
              <li>• Real-time trigger monitoring</li>
              <li>• A/B testing for directive effectiveness</li>
              <li>• Conditional logic for complex triggers</li>
              <li>• Directive scheduling and timing</li>
              <li>• Client feedback integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};