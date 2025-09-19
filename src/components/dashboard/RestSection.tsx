import React from 'react';
import { Moon, Clock, BarChart3 } from 'lucide-react';
import { SleepStackedBar } from './SleepStackedBar';
import { RestData } from '../../types/metrics';
import { CollapsibleTile } from './CollapsibleTile';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

export const RestSection: React.FC = () => {
  const avgSleep = 7.2;
  const sleepGoal = 8;
  const sleepQuality = 85;

  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
  // Mock sleep data
  const mockRestData: RestData[] = [
    {
      date: '2024-01-15',
      sleep_duration_min: 450,
      bed_time: '23:30',
      wake_time: '07:00',
      rem_min: 90,
      deep_min: 135,
      light_min: 225,
      wakenings: 1,
      sex_flag: false,
      supplement_stack: ['melatonin', 'magnesium']
    },
    {
      date: '2024-01-16',
      sleep_duration_min: 420,
      bed_time: '00:15',
      wake_time: '07:15',
      rem_min: 85,
      deep_min: 120,
      light_min: 215,
      wakenings: 2,
      sex_flag: true,
      supplement_stack: ['melatonin']
    },
    {
      date: '2024-01-17',
      sleep_duration_min: 480,
      bed_time: '22:45',
      wake_time: '06:45',
      rem_min: 95,
      deep_min: 145,
      light_min: 240,
      wakenings: 0,
      sex_flag: false,
      supplement_stack: ['melatonin', 'magnesium', 'l-theanine']
    },
    {
      date: '2024-01-18',
      sleep_duration_min: 435,
      bed_time: '23:45',
      wake_time: '07:00',
      rem_min: 88,
      deep_min: 130,
      light_min: 217,
      wakenings: 1,
      sex_flag: false,
      supplement_stack: ['melatonin']
    },
    {
      date: '2024-01-19',
      sleep_duration_min: 465,
      bed_time: '23:00',
      wake_time: '06:45',
      rem_min: 92,
      deep_min: 140,
      light_min: 233,
      wakenings: 0,
      sex_flag: true,
      supplement_stack: ['melatonin', 'magnesium']
    },
    {
      date: '2024-01-20',
      sleep_duration_min: 405,
      bed_time: '00:30',
      wake_time: '07:15',
      rem_min: 80,
      deep_min: 115,
      light_min: 210,
      wakenings: 3,
      sex_flag: false,
      supplement_stack: ['melatonin']
    },
    {
      date: '2024-01-21',
      sleep_duration_min: 450,
      bed_time: '23:15',
      wake_time: '06:45',
      rem_min: 90,
      deep_min: 135,
      light_min: 225,
      wakenings: 1,
      sex_flag: false,
      supplement_stack: ['melatonin', 'magnesium']
    }
  ];

  const condensedContent = (
    <div className="text-center p-2">
      {/* Sleep Duration */}
      <div className="mb-3 sm:mb-4">
        <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
          {avgSleep}<span className="text-sm sm:text-lg text-gray-400">h</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-400">Average sleep</p>
      </div>
      
      {/* Sleep Quality Bar */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1 sm:mb-2">
          <span>Quality</span>
          <span>{sleepQuality}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
          <div 
            className="bg-pat-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${sleepQuality}%` }}
          />
        </div>
      </div>
    </div>
  );

  const fullContent = (
    <>
      {condensedContent}
      
      {/* Sleep Cycles */}
      <div className="flex justify-between items-center text-xs mb-4">
        <div className="text-center">
          <div className="w-8 h-8 bg-pat-blue-500/20 rounded-full flex items-center justify-center mb-1">
            <Clock size={12} className="text-pat-blue-400" />
          </div>
          <span className="text-gray-400">4.2 cycles</span>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 bg-pat-blue-500/20 rounded-full flex items-center justify-center mb-1">
            <BarChart3 size={12} className="text-pat-blue-400" />
          </div>
          <span className="text-gray-400">Deep: 22%</span>
        </div>
      </div>

      {/* Sleep Stages Visualization */}
      <SleepStackedBar data={mockRestData} />
      
      {/* Sleep consistency indicator */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Consistency</span>
          <span className="text-pat-blue-400">Good</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-white font-medium">Bedtime variance</span>
          <span className="text-gray-400">±45 min</span>
        </div>
      </div>
    </>
  );

  return (
    <div style={{ position: 'relative' }}>
      <DataSourceBadge source="mock" />
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