import React from 'react';
import { EffortData } from '../../types/metrics';

interface VolumeProgressChartProps {
  data: EffortData[];
  className?: string;
}

export const VolumeProgressChart: React.FC<VolumeProgressChartProps> = ({ data, className = '' }) => {
  // Group data by week and muscle group
  const getWeeklyVolume = () => {
    const weeklyData: { [week: string]: { [muscle: string]: number } } = {};
    
    // For demo purposes, generate last 8 weeks of data
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekKey = `Week ${8 - i}`;
      weeks.push(weekKey);
      
      weeklyData[weekKey] = {
        'Chest': Math.floor(Math.random() * 5000) + 8000,
        'Back': Math.floor(Math.random() * 4000) + 7000,
        'Shoulders': Math.floor(Math.random() * 3000) + 4000,
        'Arms': Math.floor(Math.random() * 3000) + 5000,
        'Legs': Math.floor(Math.random() * 6000) + 12000,
      };
    }
    
    return { weeklyData, weeks };
  };

  const { weeklyData, weeks } = getWeeklyVolume();
  
  const muscleGroups = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'];
  const colors = {
    'Chest': 'bg-red-500',
    'Back': 'bg-blue-500',
    'Shoulders': 'bg-yellow-500',
    'Arms': 'bg-green-500',
    'Legs': 'bg-purple-500'
  };

  // Find max volume for scaling
  const maxVolume = Math.max(
    ...weeks.map(week => 
      Object.values(weeklyData[week]).reduce((sum, vol) => sum + vol, 0)
    )
  );

  return (
    <div className={`${className}`}>
      <h4 className="text-sm font-medium text-gray-300 mb-4">Weekly Volume Progression</h4>
      
      {/* Chart */}
      <div className="flex items-end justify-between h-32 mb-4">
        {weeks.map((week) => { // eslint-disable-next-line react/jsx-key
          const weekData = weeklyData[week];
          const totalVolume = Object.values(weekData).reduce((sum, vol) => sum + vol, 0);
          const barHeight = (totalVolume / maxVolume) * 100;
          
          return (
            <div key={week} className="flex flex-col items-center flex-1 mx-1">
              <div 
                className="w-full flex flex-col justify-end rounded-t-sm overflow-hidden bg-gray-800 relative group cursor-pointer"
                style={{ height: '128px' }}
              >
                {/* Stacked segments */}
                {muscleGroups.map((muscle, muscleIndex) => {
                  const volume = weekData[muscle];
                  const segmentHeight = (volume / totalVolume) * barHeight;
                  
                  return (
                    <div
                      key={muscle}
                      className={`${colors[muscle as keyof typeof colors]} transition-all duration-300 group-hover:brightness-110`}
                      style={{ height: `${segmentHeight}%` }}
                      title={`${muscle}: ${volume.toLocaleString()} lbs`}
                    />
                  );
                })}
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {week}<br />
                  Total: {totalVolume.toLocaleString()} lbs
                </div>
              </div>
              
              <span className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left">
                {week.replace('Week ', 'W')}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {muscleGroups.map(muscle => (
          <div key={muscle} className="flex items-center gap-1">
            <div className={`w-3 h-3 ${colors[muscle as keyof typeof colors]} rounded-sm`}></div>
            <span className="text-gray-400">{muscle}</span>
          </div>
        ))}
      </div>
      
      {/* Current week stats */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <div className="text-xs text-gray-400 mb-2">This Week</div>
        <div className="flex justify-between items-center">
          <span className="text-white font-medium">
            {Object.values(weeklyData[weeks[weeks.length - 1]]).reduce((sum, vol) => sum + vol, 0).toLocaleString()} lbs
          </span>
          <span className="text-green-400 text-xs">
            +12% vs last week
          </span>
        </div>
      </div>
    </div>
  );
};