import React from 'react';
import { Calendar, Target, TrendingUp } from 'lucide-react';
import { HeatmapCalendar } from './HeatmapCalendar';
import { FrequencyData } from '../../types/metrics';
import { CollapsibleTile } from './CollapsibleTile';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

interface FrequencySectionProps {
  frequencyData?: Array<{
    workout_date: string;
    duration_minutes: number;
    workout_type: string;
  }>;
}

export const FrequencySection: React.FC<FrequencySectionProps> = ({ frequencyData = [] }) => {
  // Calculate workout days this week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);
  
  const thisWeekWorkouts = frequencyData.filter(workout => 
    workout.workout_date >= startOfWeekStr
  );
  const workoutDays = thisWeekWorkouts.length;
  const weeklyGoal = 5;
  const actualProgress = (workoutDays / weeklyGoal) * 100;

  // Transform data for HeatmapCalendar component
  const transformedData: FrequencyData[] = frequencyData.map(workout => ({
    date: workout.workout_date,
    workout_type: workout.workout_type as FrequencyData['workout_type'],
    duration_min: workout.duration_minutes,
    volume_lbs: 0, // Will be calculated in EffortSection
    scheduled: true,
    missed_reason: undefined
  }));

  const condensedContent = (
    <div className="text-center p-2">
      {/* Progress Ring */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            className="text-gray-700"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeDasharray={`${actualProgress * 1.76} 176`}
            className="text-pat-purple-500 transition-all duration-500"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base sm:text-lg font-bold text-white">{workoutDays}</span>
        </div>
      </div>
      
      <p className="text-xs sm:text-sm text-gray-400 mb-1 sm:mb-2">Days this week</p>
      <div className="flex items-center justify-center gap-1 sm:gap-2 text-xs text-pat-purple-400">
        <Target size={12} />
        <span className="hidden sm:inline">Goal: {weeklyGoal} days</span>
        <span className="sm:hidden">{weeklyGoal} goal</span>
      </div>
    </div>
  );

  const fullContent = (
    <>
      {condensedContent}
      
      {frequencyData.length > 0 ? (
        <>
          {/* Mini heatmap */}
          <div key="mini-heatmap" className="flex justify-center gap-1 mb-4 mt-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-sm ${
                  i < actualWorkoutDays ? 'bg-pat-purple-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Heatmap Calendar */}
          <HeatmapCalendar data={transformedData} />
          
          {/* Weekly stats */}
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">This week</span>
              <div className="flex items-center gap-1 text-pat-purple-400">
                <TrendingUp size={12} />
                <span>Track workouts to see trends</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-white font-medium">{workoutDays} workouts</span>
              <span className="text-gray-400">
                {thisWeekWorkouts.reduce((total, w) => total + w.duration_minutes, 0)} min total
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 text-center py-8">
          <Calendar size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-2">No workout data yet</p>
          <p className="text-gray-500 text-xs">Start logging workouts to see your frequency patterns</p>
        </div>
      )}
    </>
  );

  return (
    <div style={{ position: 'relative' }}>
      <DataSourceBadge source="live" />
      <CollapsibleTile
        title="Frequency"
        icon={Calendar}
        iconColor="text-pat-purple-400"
        hoverColor="border-pat-purple-600"
        condensedContent={condensedContent}
        className=""
      >
        {fullContent}
      </CollapsibleTile>
    </div>
  );
};