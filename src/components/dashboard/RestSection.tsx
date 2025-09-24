import React from 'react';
import { Moon, Clock, BarChart3 } from 'lucide-react';
import { SleepStackedBar } from './SleepStackedBar';
import { RestData } from '../../types/metrics';
import { CollapsibleTile } from './CollapsibleTile';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

interface RestSectionProps {
  sleepLogs?: Array<{
    sleep_date: string;
    duration_minutes: number;
    quality_score?: number;
    deep_sleep_minutes: number;
    rem_sleep_minutes: number;
    light_sleep_minutes: number;
  }>;
  isLoading?: boolean;
  error?: string | null;
}

export const RestSection: React.FC<RestSectionProps> = ({ 
  sleepLogs = [], 
  isLoading = false, 
  error = null 
}) => {
  // Process live sleep data
  const data = Array.isArray(sleepLogs) ? sleepLogs : [];
  
  // Calculate actual metrics from data
  const avgSleep = data.length > 0 
    ? data.reduce((sum, d) => sum + (d.duration_minutes / 60), 0) / data.length
    : 0;
  const sleepGoal = 8;
  const sleepQuality = data.length > 0 
    ? data.reduce((sum, d) => {
        const totalSleep = d.rem_sleep_minutes + d.deep_sleep_minutes + d.light_sleep_minutes;
        const qualityScore = totalSleep > 0 ? 
          ((d.deep_sleep_minutes + d.rem_sleep_minutes) / totalSleep) * 100 : 
          (d.quality_score || 0);
        return sum + qualityScore;
      }, 0) / data.length
    : 0;

  // Transform data for SleepStackedBar component  
  const transformedData: RestData[] = data.map(sleep => ({
    date: sleep.sleep_date,
    sleep_duration_min: sleep.duration_minutes,
    bed_time: '23:00', // Default for now, could be extracted from sleep_date logic
    wake_time: '07:00', // Default for now
    rem_min: sleep.rem_sleep_minutes,
    deep_min: sleep.deep_sleep_minutes,
    light_min: sleep.light_sleep_minutes,
    wakenings: 0, // Default for now
    sex_flag: false,
    supplement_stack: []
  }));

  // Guard against loading and error states
  if (isLoading) {
    return (
      <div style={{ position: 'relative' }}>
        <DataSourceBadge source="live" />
        <CollapsibleTile
          title="Rest"
          icon={Moon}
          iconColor="text-pat-blue-400"
          hoverColor="border-pat-blue-600"
          condensedContent={
            <div className="text-center p-2">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-gray-400">Loading sleep...</p>
            </div>
          }
          className=""
        >
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading sleep data...</p>
          </div>
        </CollapsibleTile>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ position: 'relative' }}>
        <DataSourceBadge source="live" />
        <CollapsibleTile
          title="Rest"
          icon={Moon}
          iconColor="text-pat-blue-400"
          hoverColor="border-pat-blue-600"
          condensedContent={
            <div className="text-center p-2">
              <p className="text-xs text-red-400">Error loading data</p>
            </div>
          }
          className=""
        >
          <div className="text-center py-8">
            <p className="text-red-400 text-sm">Error: {error}</p>
          </div>
        </CollapsibleTile>
      </div>
    );
  }

  const condensedContent = (
    <div className="text-center p-2">
      {/* Sleep Duration */}
      <div className="mb-3 sm:mb-4">
        <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
          {avgSleep > 0 ? avgSleep.toFixed(1) : '0'}<span className="text-sm sm:text-lg text-gray-400">h</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-400">Average sleep</p>
      </div>
      
      {/* Sleep Quality Bar */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1 sm:mb-2">
          <span>Quality</span>
          <span>{sleepQuality > 0 ? Math.round(sleepQuality) : 0}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
          <div 
            className="bg-pat-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${sleepQuality > 0 ? Math.round(sleepQuality) : 0}%` }}
          />
        </div>
      </div>
    </div>
  );

  const fullContent = (
    <>
      {condensedContent}
      
      {restData.length > 0 ? (
      {data.length > 0 ? (
        <>
          {/* Sleep Cycles */}
          <div className="flex justify-between items-center text-xs mb-4">
            <div className="text-center">
              <div className="w-8 h-8 bg-pat-blue-500/20 rounded-full flex items-center justify-center mb-1">
                <Clock size={12} className="text-pat-blue-400" />
              </div>
              <span className="text-gray-400">{(avgSleep / 1.5).toFixed(1)} cycles</span>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-pat-blue-500/20 rounded-full flex items-center justify-center mb-1">
                <BarChart3 size={12} className="text-pat-blue-400" />
              </div>
              <span className="text-gray-400">
                Deep: {restData.length > 0 ? Math.round((restData[restData.length - 1].deep_sleep_minutes / (restData[restData.length - 1].deep_sleep_minutes + restData[restData.length - 1].rem_sleep_minutes + restData[restData.length - 1].light_sleep_minutes)) * 100) : 0}%
                Deep: {data.length > 0 ? Math.round((data[data.length - 1].deep_sleep_minutes / (data[data.length - 1].deep_sleep_minutes + data[data.length - 1].rem_sleep_minutes + data[data.length - 1].light_sleep_minutes)) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Sleep Stages Visualization */}
          <SleepStackedBar data={transformedData} />
          
          {/* Sleep consistency indicator */}
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Consistency</span>
              <span className="text-pat-blue-400">Track for insights</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-white font-medium">Sleep pattern</span>
              <span className="text-gray-400">Building data</span>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 text-center py-8">
          <Moon size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-2">No sleep data yet</p>
          <p className="text-gray-500 text-xs">Start tracking sleep to see your patterns</p>
        </div>
      )}
    </>
  );

  return (
    <div style={{ position: 'relative' }}>
      <DataSourceBadge source="live" />
      <CollapsibleTile
        title="Rest"
        icon={Moon}
        iconColor="text-pat-blue-400"
        hoverColor="border-pat-blue-600"
        condensedContent={condensedContent}
        className=""
      >
        {fullContent}
      </CollapsibleTile>
    </div>
  );
};