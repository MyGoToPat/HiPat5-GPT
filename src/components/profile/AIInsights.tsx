import React from 'react';
import { Brain, Lightbulb, TrendingUp, Target, CheckCircle, Moon, Plus } from 'lucide-react';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

interface AIInsightsProps {
  insights?: Insight[];
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

export const AIInsights: React.FC<AIInsightsProps> = ({ insights = [], className = '' }) => {
  const hasInsights = insights.length > 0;

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
    <div className={`bg-gray-900 rounded-2xl p-6 border border-gray-800 ${className}`} style={{ position: 'relative' }}>
      <DataSourceBadge source="live" />
      <div className="flex items-center gap-2 mb-6">
        <Brain size={20} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-white">AI Insights</h3>
        {hasInsights && (
          <span className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs font-medium rounded-full">
            {insights.filter(i => i.actionable).length} actionable
          </span>
        )}
      </div>

      {!hasInsights ? (
        <div className="text-center py-12">
          <Brain size={48} className="text-gray-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-400 mb-2">AI Insights Coming Soon</h4>
          <p className="text-gray-500 text-sm mb-6">
            Start logging your workouts, meals, and sleep data. Pat will analyze your patterns and provide personalized insights as you build your health journey.
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-400 text-sm">
            <Plus size={16} />
            <span>Log data to unlock AI insights</span>
          </div>
        </div>
      ) : (
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
      )}

      {/* Pat's Summary - only show if there are insights */}
      {hasInsights && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={16} className="text-purple-400" />
            <span className="font-medium text-purple-300 text-sm">Pat says:</span>
          </div>
          <p className="text-purple-200 text-sm italic">
            "Your patterns are becoming clearer as you log more data. Keep up the consistent tracking - I'm learning how to help you better!"
          </p>
        </div>
      )}
    </div>
  );
};