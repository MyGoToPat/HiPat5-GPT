import React from 'react';
import { Brain, Lightbulb, TrendingUp, Target, CheckCircle, Moon } from 'lucide-react';

interface AIInsightsProps {
  className?: string;
}

interface Insight {
  id: string;
  type: 'pattern' | 'achievement' | 'recommendation' | 'tip';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ className = '' }) => {
  // Long-term AI insights focused on patterns and historical analysis over months/years
  const insights: Insight[] = [
    {
      id: '1',
      type: 'pattern',
      title: 'Long-term Recovery Pattern',
      description: 'Over the past 6 months, your recovery metrics show a 25% improvement. Your sleep quality strongly correlates with next-day performance, especially on strength training days.',
      actionable: true,
      priority: 'medium',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      icon: Lightbulb,
      color: 'text-yellow-400'
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Consistency Milestone Achieved',
      description: 'Congratulations! You\'ve maintained an 80%+ consistency rate for 3 consecutive months. This represents a significant behavioral shift in your health journey.',
      actionable: false,
      priority: 'high',
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      icon: CheckCircle,
      color: 'text-green-400'
    },
    {
      id: '3',
      type: 'recommendation',
      title: 'Seasonal Training Adjustment',
      description: 'Historical data shows your performance peaks in fall/winter months. Consider planning major goals and challenges during September-February for optimal results.',
      actionable: true,
      priority: 'medium',
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      icon: Moon,
      color: 'text-blue-400'
    },
    {
      id: '4',
      type: 'tip',
      title: 'Long-term Nutrition Evolution',
      description: 'Your macro adherence has steadily improved from 65% to 85% over the past year. This gradual improvement approach is sustainable and should continue long-term.',
      actionable: true,
      priority: 'low',
      timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      icon: Target,
      color: 'text-purple-400'
    }
  ];

  const getInsightBorderColor = (type: Insight['type']) => {
    switch (type) {
      case 'recommendation':
        return 'border-yellow-500/30';
      case 'achievement':
        return 'border-green-500/30';
      case 'warning':
        return 'border-red-500/30';
      case 'tip':
        return 'border-blue-500/30';
      default:
        return 'border-gray-500/30';
    }
  };

  const getInsightBackground = (type: Insight['type']) => {
    switch (type) {
      case 'recommendation':
        return 'bg-yellow-500/10';
      case 'achievement':
        return 'bg-green-500/10';
      case 'warning':
        return 'bg-red-500/10';
      case 'tip':
        return 'bg-blue-500/10';
      default:
        return 'bg-gray-500/10';
    }
  };

  const getPriorityBadge = (priority: Insight['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-600 text-white';
      case 'medium':
        return 'bg-yellow-600 text-white';
      case 'low':
        return 'bg-gray-600 text-white';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m ago`;
    } else if (diffInMinutes < 24 * 60) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / (24 * 60))}d ago`;
    }
  };

  return (
    <div className={`bg-gray-900 rounded-2xl p-6 border border-gray-800 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Brain size={20} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-white">AI Insights</h3>
        <span className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs font-medium rounded-full">
          {insights.filter(i => i.actionable).length} actionable
        </span>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => {
          const IconComponent = insight.icon;
          return (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border ${getInsightBorderColor(insight.type)} ${getInsightBackground(insight.type)} hover:scale-[1.01] transition-transform cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <IconComponent size={16} className={insight.color} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-white text-sm">{insight.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(insight.priority)}`}>
                      {insight.priority}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {formatTimeAgo(insight.timestamp)} • {insight.type}
                    </div>
                    
                    {insight.actionable && (
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                        Take Action
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pat's Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={16} className="text-purple-400" />
          <span className="font-medium text-purple-300 text-sm">Pat says:</span>
        </div>
        <p className="text-purple-200 text-sm italic">
          "Your long-term trends are impressive! The consistency you've built over the past year is the foundation for lasting success. Keep focusing on sustainable habits rather than day-to-day fluctuations!"
        </p>
      </div>
    </div>
  );
};