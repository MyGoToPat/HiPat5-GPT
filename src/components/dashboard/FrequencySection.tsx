import React from 'react';
import { Calendar, Target, TrendingUp } from 'lucide-react';
import { HeatmapCalendar } from './HeatmapCalendar';
import { FrequencyData } from '../../types/metrics';
import { CollapsibleTile } from './CollapsibleTile';

export const FrequencySection: React.FC = () => {
  const workoutDays = 4;
  const weeklyGoal = 5;
  const progress = (workoutDays / weeklyGoal) * 100;

  // Mock data for heatmap
  const mockFrequencyData: FrequencyData[] = [
    { date: '2024-01-15', workout_type: 'Resistance', duration_min: 75, volume_lbs: 12500, scheduled: true },
    { date: '2024-01-16', workout_type: 'Cardio', duration_min: 45, volume_lbs: 0, scheduled: true },
    { date: '2024-01-17', workout_type: 'Rest', duration_min: 0, volume_lbs: 0, scheduled: true },
    { date: '2024-01-18', workout_type: 'Resistance', duration_min: 80, volume_lbs: 13200, scheduled: true },
    { date: '2024-01-19', workout_type: 'Hybrid', duration_min: 60, volume_lbs: 8500, scheduled: true },
  ];

  const condensedContent = (
    <div className="text-center">
      {/* Progress Ring */}
      <div className="relative w-16 h-16 mx-auto mb-3">
        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-700"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${progress * 1.76} 176`}
            className="text-pat-purple-500 transition-all duration-500"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{workoutDays}</span>
        </div>
      </div>
      
      <p className="text-sm text-gray-400 mb-2">Days this week</p>
      <div className="flex items-center justify-center gap-2 text-xs text-pat-purple-400">
        <Target size={12} />
        <span>Goal: {weeklyGoal} days</span>
      </div>
    </div>
  );

  const fullContent = (
    <>
      {condensedContent}
      
      {/* Mini heatmap */}
      <div key="mini-heatmap" className="flex justify-center gap-1 mb-4 mt-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm ${
              i < workoutDays ? 'bg-pat-purple-500' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Heatmap Calendar */}
      <HeatmapCalendar data={mockFrequencyData} />
      
      {/* Weekly stats */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">This week</span>
          <div className="flex items-center gap-1 text-pat-purple-400">
            <TrendingUp size={12} />
            <span>+15% vs last week</span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-white font-medium">4 workouts</span>
          <span className="text-gray-400">285 min total</span>
        </div>
      </div>
    </>
  );

  return (
    <CollapsibleTile
      title="Frequency"
      icon={Calendar}
      iconColor="text-pat-purple-400"
      hoverColor="border-pat-purple-600"
      condensedContent={condensedContent}
      className="min-w-[300px]"
    >
      {fullContent}
    </CollapsibleTile>
  );
};