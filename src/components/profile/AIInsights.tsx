import React, { useState } from 'react';
import { Brain, Lightbulb, AlertTriangle, CheckCircle, TrendingUp, ChevronRight, X } from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'recommendation' | 'achievement' | 'warning' | 'tip';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

interface AIInsightsProps {
  insights: AIInsight[];
}

export const AIInsights: React.FC<AIInsightsProps> = ({ insights }) => {
  const [dismissedInsights, setDismissedInsights] = useState<string[]>([]);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'recommendation':
        return <Lightbulb size={16} className="text-yellow-400" />;
      case 'achievement':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-red-400" />;
      case 'tip':
        return <TrendingUp size={16} className="text-blue-400" />;
    }
  };

  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-red-500/30 bg-red-500/10';
      case 'medium':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'low':
        return 'border-blue-500/30 bg-blue-500/10';
    }
  };

  const handleDismiss = (insightId: string) => {
    setDismissedInsights(prev => [...prev, insightId]);
  };

  const handleTakeAction = (insight: AIInsight) => {
    // Implement action handling based on insight type
    console.log('Taking action for insight:', insight.title);
  };

  const visibleInsights = insights.filter(insight => !dismissedInsights.includes(insight.id));

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <Brain size={20} className="text-purple-400" />
        <h3 className="text-lg font-semibold text-white">AI Insights from Pat</h3>
        <div className="ml-auto text-xs text-gray-400">
          {visibleInsights.length} active insight{visibleInsights.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      {visibleInsights.length === 0 ? (
        <div className="text-center py-8">
          <Brain size={32} className="text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400">No insights available</p>
          <p className="text-gray-500 text-sm">Keep using Pat to get personalized recommendations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleInsights.map((insight) => (
            <div
              key={insight.id}
              className={`border rounded-lg transition-all ${getPriorityColor(insight.priority)} ${
                expandedInsight === insight.id ? 'ring-2 ring-purple-500/50' : ''
              }`}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getInsightIcon(insight.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-white font-medium text-sm">{insight.title}</h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExpandedInsight(
                            expandedInsight === insight.id ? null : insight.id
                          )}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          <ChevronRight 
                            size={14} 
                            className={`text-gray-400 transition-transform ${
                              expandedInsight === insight.id ? 'rotate-90' : ''
                            }`} 
                          />
                        </button>
                        <button
                          onClick={() => handleDismiss(insight.id)}
                          className="p-1 hover:bg-gray-700 rounded transition-colors"
                        >
                          <X size={14} className="text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                      {expandedInsight === insight.id ? insight.description : 
                       insight.description.length > 100 ? 
                       `${insight.description.substring(0, 100)}...` : 
                       insight.description
                      }
                    </p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className={`px-2 py-1 rounded-full ${
                          insight.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                          insight.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {insight.priority} priority
                        </span>
                        <span>{insight.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                      </div>
                      
                      {insight.actionable && (
                        <button
                          onClick={() => handleTakeAction(insight)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors"
                        >
                          Take Action
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pat's Learning Note */}
      <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-purple-300 text-sm">
          <Brain size={14} />
          <span className="font-medium">Pat learns from your patterns</span>
        </div>
        <p className="text-purple-200 text-xs mt-1">
          These insights get more accurate as you use the app. Pat analyzes your data to provide personalized recommendations.
        </p>
      </div>
    </div>
  );
};