import React from 'react';
import { TrendingUp, Target, Activity, Award, Calendar, Plus, BarChart3 } from 'lucide-react';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

interface ProgressVisualizationsProps {
  weightData?: WeightData[];
  progressMetrics?: ProgressMetric[];
  className?: string;
}

interface ProgressMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: number;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
  target?: number;
}

interface WeightData {
  date: string;
  weight: number;
  bodyFat?: number;
}

export const ProgressVisualizations: React.FC<ProgressVisualizationsProps> = ({ 
  weightData = [],
  progressMetrics = [],
  className = '' 
}) => {
  const hasWeightData = weightData.length > 0;
  const hasProgressData = progressMetrics.length > 0;

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp size={16} className="text-green-500" />;
    if (trend < 0) return <TrendingUp size={16} className="text-red-500 rotate-180" />;
    return <div className="w-4 h-4" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-500';
    if (trend < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div className={`bg-gray-900 rounded-2xl p-6 border border-gray-800 ${className}`} style={{ position: 'relative' }}>
      <DataSourceBadge source="live" />
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={20} className="text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Progress Overview</h3>
      </div>

      {/* Show empty state if no data */}
      {!hasProgressData && !hasWeightData ? (
        <div className="text-center py-12">
          <BarChart3 size={48} className="text-gray-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-400 mb-2">Start Tracking Your Progress</h4>
          <p className="text-gray-500 text-sm mb-6">
            Complete your onboarding and start logging workouts to see your progress visualizations here.
          </p>
          <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
            <Plus size={16} />
            <span>Complete TDEE wizard to begin tracking</span>
          </div>
        </div>
      ) : (
        <>
          {/* Progress Metrics Grid */}
          {hasProgressData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {progressMetrics.map((metric) => {
                const IconComponent = metric.icon;
                return (
                  <div key={metric.id} className="bg-gray-800 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <IconComponent size={16} className={metric.color} />
                      <span className="text-sm font-medium text-gray-300">{metric.label}</span>
                    </div>
                    
                    <div className="text-xl font-bold text-white mb-1">
                      {metric.value}{metric.unit}
                    </div>
                    
                    {metric.target && (
                      <div className="text-xs text-gray-400 mb-2">
                        Target: {metric.target}{metric.unit}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center gap-1 text-xs">
                      {getTrendIcon(metric.trend)}
                      <span className={getTrendColor(metric.trend)}>
                        {metric.trend > 0 ? '+' : ''}{metric.trend}{metric.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Weight Progress Chart */}
          {hasWeightData && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-4">Weight Trend (12-Month History)</h4>
              
              <div className="h-32 flex items-end justify-between gap-2">
                {weightData.map((data, index) => {
                  const maxWeight = Math.max(...weightData.map(d => d.weight));
                  const minWeight = Math.min(...weightData.map(d => d.weight));
                  const height = ((data.weight - minWeight) / (maxWeight - minWeight)) * 100;
                  
                  return (
                    <div key={index} className="flex flex-col items-center group">
                      <div className="relative w-full">
                        <div 
                          className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-400 cursor-pointer"
                          style={{ height: `${height + 20}px` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            {new Date(data.date).toLocaleDateString()}<br />
                            {data.weight} lbs
                            {data.bodyFat && <br />}
                            {data.bodyFat && `${data.bodyFat}% BF`}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left">
                        {new Date(data.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center group">
                <div className="relative w-full">
                  <div 
                    className="w-full bg-blue-500 rounded-t-sm transition-all duration-300 hover:bg-blue-400 cursor-pointer"
                    style={{ height: `${height + 20}px` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {new Date(data.date).toLocaleDateString()}<br />
                      {data.weight} lbs
                      {data.bodyFat && <br />}
                      {data.bodyFat && `${data.bodyFat}% BF`}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left">
                  {new Date(data.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};