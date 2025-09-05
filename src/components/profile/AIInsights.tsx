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
      title: 'Optimize Your Recovery',
      description: 'Based on your recent workouts, I recommend adding 15 minutes of stretching after your sessions. Your muscle tension indicators suggest this could improve your next-day performance by 12%.',
      actionable: true,
      priority: 'high',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: Lightbulb,
      color: 'text-yellow-400'
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Protein Intake Improvement',
      description: 'Great job! Your protein consistency has improved 40% this month. You\'re now hitting your target 85% of the time, up from 60%.',
      actionable: false,
      priority: 'medium',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      icon: CheckCircle,
      color: 'text-green-400'
    },
    {
      id: '3',
      type: 'tip',
      title: 'Sleep Optimization Window',
      description: 'I\'ve noticed you perform best when you sleep between 10:30 PM - 6:30 AM. Consider adjusting your bedtime by 30 minutes earlier for optimal recovery.',
      actionable: true,
      priority: 'medium',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      icon: Moon,
      color: 'text-blue-400'
    },
    {
      id: '4',
      type: 'warning',
      title: 'Potential Overreaching',
      description: 'Your training volume has increased 25% this week while sleep quality decreased. Consider a deload or extra rest day to prevent burnout.',
      actionable: true,
      priority: 'high',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      icon: AlertTriangle,
      color: 'text-red-400'
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
          "You're making excellent progress! Focus on your sleep schedule this week, and you'll see even better results. Keep up the great work!"
        </p>
      </div>
    </div>
  );
};