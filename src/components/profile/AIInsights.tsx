import React from 'react';
import { Brain, Lightbulb, TrendingUp, Target, AlertTriangle, CheckCircle, Zap, Moon } from 'lucide-react';

interface AIInsightsProps {
  className?: string;
}

interface Insight {
  id: string;
  type: 'recommendation' | 'achievement' | 'warning' | 'tip';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ className = '' }) => {
  // Mock AI insights data
  const insights: Insight[] = [
    {
      id: '1',
      type: 'recommendation',
      title: 'Long-term Recovery Strategy',
      description: 'Over the past 3 months, I\'ve noticed your recovery patterns. Adding consistent stretching and mobility work could improve your overall training capacity by 18%.',
      actionable: true,
      priority: 'high',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      icon: Lightbulb,
      color: 'text-yellow-400'
    },
    {
      id: '2',
      type: 'achievement',
      title: '3-Month Nutrition Milestone',
      description: 'Incredible progress! Your nutrition consistency has improved 65% over the past quarter. You\'re now hitting your targets 88% of the time.',
      actionable: false,
      priority: 'medium',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      icon: CheckCircle,
      color: 'text-green-400'
    },
    {
      id: '3',
      type: 'tip',
      title: 'Quarterly Sleep Pattern Analysis',
      description: 'After tracking your data for 90+ days, your optimal sleep window is 10:30 PM - 6:30 AM. This pattern correlates with your best performance periods.',
      actionable: true,
      priority: 'medium',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      icon: Moon,
      color: 'text-blue-400'
    },
    {
      id: '4',
      type: 'warning',
      title: 'Training Volume Trend Alert',
      description: 'Your training volume has consistently increased 35% over 2 months. Consider implementing planned deload weeks to optimize long-term progress.',
      actionable: true,
      priority: 'high',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      icon: AlertTriangle,
      color: 'text-red-400'
    },
    {
      id: '5',
      type: 'pattern',
      title: 'Seasonal Performance Pattern',
      description: 'Your data shows 23% better adherence during winter months. Consider leveraging this natural rhythm for goal setting.',
      actionable: true,
      priority: 'low',
      timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      icon: Brain,
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
    <div className={`bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-800 ${className}`}>
      <div className="flex items-center gap-2 mb-6">
        <Brain size={20} className="text-purple-400" />
        <h3 className="text-base sm:text-lg font-semibold text-white">Long-Term AI Insights</h3>
        <span className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs font-medium rounded-full">
          {insights.filter(i => i.actionable).length} trends
        </span>
      </div>

      <div className="space-y-4">
        {insights.map((insight) => {
          const IconComponent = insight.icon;
          return (
            <div
              key={insight.id}
              className={`p-3 sm:p-4 rounded-lg border ${getInsightBorderColor(insight.type)} ${getInsightBackground(insight.type)} hover:scale-[1.01] transition-transform cursor-pointer`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <IconComponent size={16} className={insight.color} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-white text-xs sm:text-sm">{insight.title}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(insight.priority)}`}>
                      {insight.priority}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-3">
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {formatTimeAgo(insight.timestamp)} • {insight.type} trend
                    </div>
                    
                    {insight.actionable && (
                      <button className="px-2 sm:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                        Explore
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
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={16} className="text-purple-400" />
          <span className="font-medium text-purple-300 text-xs sm:text-sm">Pat's Long-term Analysis:</span>
        </div>
        <p className="text-purple-200 text-xs sm:text-sm italic">
          "Looking at your 3-month journey, you've built incredible momentum! Your consistency patterns show you're becoming a true health champion. I'm excited to see where the next quarter takes you!"
        </p>
      </div>
    </div>
  );
};