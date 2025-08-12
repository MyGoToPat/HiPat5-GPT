import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { CrossMetricInsight } from '../../types/metrics';

interface CrossMetricInsightsProps {
  insights: CrossMetricInsight[];
  className?: string;
}

export const CrossMetricInsights: React.FC<CrossMetricInsightsProps> = ({ insights, className = '' }) => {
  const getTrendIcon = (trend: CrossMetricInsight['trend']) => {
    switch (trend) {
      case 'positive':
        return <TrendingUp size={16} className="text-green-400" />;
      case 'negative':
        return <TrendingDown size={16} className="text-red-400" />;
      case 'neutral':
        return <Minus size={16} className="text-gray-400" />;
    }
  };

  const getTrendColor = (trend: CrossMetricInsight['trend']) => {
    switch (trend) {
      case 'positive':
        return 'border-green-500/30 bg-green-500/10';
      case 'negative':
        return 'border-red-500/30 bg-red-500/10';
      case 'neutral':
        return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  return (
    <div className={`bg-gray-900 rounded-2xl p-6 shadow-pat-card border border-gray-800 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={20} className="text-pat-purple-400" />
        <h3 className="text-lg font-semibold text-white">Insights</h3>
      </div>
      
      <div className="space-y-3">
        {insights.map((insight) => ( // eslint-disable-next-line react/jsx-key
          <div
            key={insight.id}
            className={`p-4 rounded-lg border ${getTrendColor(insight.trend)} transition-all hover:scale-[1.02] cursor-pointer`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getTrendIcon(insight.trend)}
              </div>
              
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">{insight.title}</h4>
                <p className="text-gray-300 text-sm mb-2">{insight.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Correlation:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            insight.correlation > 0 ? 'bg-green-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.abs(insight.correlation)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-300">
                        {Math.abs(insight.correlation)}%
                      </span>
                    </div>
                  </div>
                  
                  {insight.actionable && (
                    <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      Take Action
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {insights.length === 0 && (
          <div className="text-center py-8">
            <BarChart3 size={32} className="text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">No insights available</p>
            <p className="text-gray-500 text-sm">Keep logging data to see correlations</p>
          </div>
        )}
      </div>
    </div>
  );
};