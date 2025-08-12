import React from 'react';
import { FrequencyData } from '../../types/metrics';

interface HeatmapCalendarProps {
  data: FrequencyData[];
  className?: string;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({ data, className = '' }) => {
  // Generate last 7 weeks of dates
  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 48); // 7 weeks back
    
    for (let i = 0; i < 49; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateCalendarDates();
  const dataMap = new Map(data.map(d => [d.date, d]));

  const getIntensityColor = (duration: number) => {
    if (duration === 0) return 'bg-gray-800';
    if (duration < 30) return 'bg-orange-900/40';
    if (duration < 60) return 'bg-orange-700/60';
    if (duration < 90) return 'bg-orange-500/80';
    return 'bg-orange-400';
  };

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-300">Activity Heatmap</h4>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-sm bg-gray-800"></div>
            <div className="w-2 h-2 rounded-sm bg-orange-900/40"></div>
            <div className="w-2 h-2 rounded-sm bg-orange-700/60"></div>
            <div className="w-2 h-2 rounded-sm bg-orange-500/80"></div>
            <div className="w-2 h-2 rounded-sm bg-orange-400"></div>
          </div>
          <span>More</span>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday headers */}
        {weekdays.map((day, index) => ( // eslint-disable-next-line react/jsx-key
          <div key={index} className="text-xs text-gray-500 text-center mb-1 h-4 flex items-center justify-center">
            {day}
          </div>
        ))}
        
        {/* Calendar grid */}
        {dates.map((date, index) => {
          const dateStr = date.toISOString().split('T')[0];
          const dayData = dataMap.get(dateStr);
          const duration = dayData?.duration_min || 0;
          
          return (
            <div
              key={index}
              className={`w-3 h-3 rounded-sm ${getIntensityColor(duration)} hover:ring-1 hover:ring-orange-400 transition-all cursor-pointer group relative`}
              title={`${date.toLocaleDateString()}: ${duration}min ${dayData?.workout_type || 'Rest'}`}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {date.toLocaleDateString()}<br />
                {duration}min {dayData?.workout_type || 'Rest'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};