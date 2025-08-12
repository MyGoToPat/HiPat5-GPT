import React from 'react';
import { RestData } from '../../types/metrics';

interface SleepStackedBarProps {
  data: RestData[];
  className?: string;
}

export const SleepStackedBar: React.FC<SleepStackedBarProps> = ({ data, className = '' }) => {
  // Get last 7 days of data
  const recentData = data.slice(-7);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={`${className}`}>
      <h4 className="text-sm font-medium text-gray-300 mb-3">Sleep Stages (Last 7 Days)</h4>
      
      <div className="space-y-2">
        {recentData.map((night) => { // eslint-disable-next-line react/jsx-key
          const total = night.rem_min + night.deep_min + night.light_min;
          const remPercent = (night.rem_min / total) * 100;
          const deepPercent = (night.deep_min / total) * 100;
          const lightPercent = (night.light_min / total) * 100;
          
          const date = new Date(night.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          
          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>{dayName}</span>
                <span>{formatTime(total)}</span>
              </div>
              
              <div className="flex h-4 rounded-full overflow-hidden bg-gray-800">
                {/* REM Sleep */}
                <div 
                  className="bg-purple-500 transition-all duration-300 group-hover:bg-purple-400"
                  style={{ width: `${remPercent}%` }}
                  title={`REM: ${formatTime(night.rem_min)}`}
                />
                
                {/* Deep Sleep */}
                <div 
                  className="bg-blue-600 transition-all duration-300 group-hover:bg-blue-500"
                  style={{ width: `${deepPercent}%` }}
                  title={`Deep: ${formatTime(night.deep_min)}`}
                />
                
                {/* Light Sleep */}
                <div 
                  className="bg-blue-300 transition-all duration-300 group-hover:bg-blue-200"
                  style={{ width: `${lightPercent}%` }}
                  title={`Light: ${formatTime(night.light_min)}`}
                />
              </div>
              
              {/* Wakenings indicator */}
              {night.wakenings > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: Math.min(night.wakenings, 5) }).map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-red-400 rounded-full" />
                  ))}
                  {night.wakenings > 5 && (
                    <span className="text-xs text-red-400">+{night.wakenings - 5}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
          <span className="text-gray-400">REM</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
          <span className="text-gray-400">Deep</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-300 rounded-sm"></div>
          <span className="text-gray-400">Light</span>
        </div>
      </div>
    </div>
  );
};