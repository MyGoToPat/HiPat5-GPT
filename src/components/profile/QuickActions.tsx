import React from 'react';
import { MessageSquare, BarChart3, Activity, Plus, Zap, Target } from 'lucide-react';

interface QuickActionsProps {
  onNavigate: (page: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const actions = [
    {
      id: 'chat',
      label: 'Chat with Pat',
      icon: MessageSquare,
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Start a conversation'
    },
    {
      id: 'dashboard',
      label: 'View Dashboard',
      icon: BarChart3,
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'See your metrics'
    },
    {
      id: 'log-activity',
      label: 'Log Activity',
      icon: Plus,
      color: 'bg-green-600 hover:bg-green-700',
      description: 'Add new data'
    },
    {
      id: 'quick-check',
      label: 'Quick Check-in',
      icon: Zap,
      color: 'bg-orange-600 hover:bg-orange-700',
      description: 'Daily wellness'
    }
  ];

  const handleActionClick = (actionId: string) => {
    switch (actionId) {
      case 'chat':
        onNavigate('chat');
        break;
      case 'dashboard':
        onNavigate('dashboard');
        break;
      case 'log-activity':
        // Could open a modal or navigate to logging page
        console.log('Log activity clicked');
        break;
      case 'quick-check':
        // Could open a quick check-in modal
        console.log('Quick check-in clicked');
        break;
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Target size={20} className="text-blue-400" />
        Quick Actions
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => { // eslint-disable-next-line react/jsx-key
          const IconComponent = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              className={`${action.color} p-4 rounded-xl text-white transition-all hover:scale-105 group`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
                  <IconComponent size={20} />
                </div>
                <h4 className="font-semibold text-sm mb-1">{action.label}</h4>
                <p className="text-xs opacity-80">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};