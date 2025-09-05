import React from 'react';
import { MessageSquare, BarChart3, Activity, CheckCircle, Plus } from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (page: string) => void;
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
  bgColor: string;
  action: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate, className = '' }) => {
  const quickActions: QuickAction[] = [
    {
      id: 'chat',
      label: 'Chat with Pat',
      description: 'Start a conversation',
      icon: MessageSquare,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20 hover:bg-blue-500/30',
      action: 'chat'
    },
    {
      id: 'dashboard',
      label: 'View Dashboard',
      description: 'Check your metrics',
      icon: BarChart3,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20 hover:bg-green-500/30',
      action: 'dashboard'
    },
    {
      id: 'activity',
      label: 'Log Activity',
      description: 'Record workout or meal',
      icon: Activity,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20 hover:bg-orange-500/30',
      action: 'voice'
    },
    {
      id: 'checkin',
      label: 'Quick Check-in',
      description: 'Update your status',
      icon: CheckCircle,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20 hover:bg-purple-500/30',
      action: 'chat'
    }
  ];

  const handleActionClick = (action: string) => {
    onNavigate(action);
  };

  return (
    <div className={`bg-gray-900 rounded-2xl p-6 border border-gray-800 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Plus size={20} className="text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.action)}
              className={`p-4 rounded-xl border border-gray-700 ${action.bgColor} transition-all duration-200 hover:scale-105 hover:border-gray-600 group`}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center group-hover:bg-gray-800/70 transition-colors">
                  <IconComponent size={20} className={action.color} />
                </div>
                
                <div>
                  <div className="font-medium text-white text-sm mb-1">
                    {action.label}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {action.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Today's Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-white">2</div>
            <div className="text-xs text-gray-400">Workouts</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">4</div>
            <div className="text-xs text-gray-400">Meals Logged</div>
          </div>
          <div>
            <div className="text-lg font-bold text-white">7.2h</div>
            <div className="text-xs text-gray-400">Sleep</div>
          </div>
        </div>
      </div>
    </div>
  );
};