import React from 'react';
import { Dumbbell, TrendingUp, Award } from 'lucide-react';
import { VolumeProgressChart } from './VolumeProgressChart';
import { EffortData } from '../../types/metrics';
import { CollapsibleTile } from './CollapsibleTile';

export const EffortSection: React.FC = () => {
  const weeklyVolume = 45250; // lbs
  const lastWeekVolume = 42100;
  const volumeIncrease = ((weeklyVolume - lastWeekVolume) / lastWeekVolume) * 100;
  const recentPRs = 3;

  // Mock effort data
  const mockEffortData: EffortData[] = [
    {
      session_id: '1',
      exercise: 'Bench Press',
      sets: 4,
      reps: 8,
      weight_lbs: 185,
      rpe: 8.5,
      rest_sec: 180,
      muscle_group: 'Chest'
    },
    {
      session_id: '1',
      exercise: 'Squat',
      sets: 4,
      reps: 6,
      weight_lbs: 225,
      rpe: 9,
      rest_sec: 240,
      muscle_group: 'Legs'
    },
  ];

  const condensedContent = (
    <div className="text-center p-2">
      {/* Weekly Volume */}
      <div className="mb-3 sm:mb-4">
        <div className="text-xl sm:text-2xl font-bold text-white mb-1">
          {(weeklyVolume / 1000).toFixed(1)}<span className="text-sm sm:text-lg text-gray-400">k</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-400">lbs this week</p>
        <div className="flex items-center justify-center gap-1 text-xs text-orange-400 mt-1">
          <TrendingUp size={12} />
          <span>+{volumeIncrease.toFixed(1)}% vs last week</span>
        </div>
      </div>
      
      {/* PRs and Stats */}
      <div className="flex justify-between items-center text-xs gap-2">
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500/20 rounded-full flex items-center justify-center mb-1">
            <Award size={12} className="text-orange-400" />
          </div>
          <span className="text-gray-400">{recentPRs} PRs</span>
        </div>
        <div className="text-center">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-500/20 rounded-full flex items-center justify-center mb-1">
            <TrendingUp size={12} className="text-orange-400" />
          </div>
          <span className="text-gray-400">RPE 7.5</span>
        </div>
      </div>
    </div>
  );

  const fullContent = (
    <>
      {condensedContent}
      
      {/* Volume Progress Bar */}
      <div className="mb-4 mt-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Weekly Progress</span>
          <span>85%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: '85%' }}
          />
        </div>
      </div>

      {/* Volume Progress Chart */}
      <VolumeProgressChart data={mockEffortData} />
      
      {/* Recent PR */}
      <div className="mt-4 p-3 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 rounded-lg border border-orange-500/30">
        <div className="flex items-center gap-2 mb-1">
          <Award size={14} className="text-orange-400" />
          <span className="text-orange-300 text-sm font-medium">New PR!</span>
        </div>
        <p className="text-white text-sm">Bench Press: 185 lbs × 8</p>
        <p className="text-gray-400 text-xs">2 days ago</p>
      </div>
    </>
  );

  return (
    <CollapsibleTile
      title="Effort"
      icon={Dumbbell}
      iconColor="text-orange-400"
      hoverColor="border-orange-600"
      condensedContent={condensedContent}
      className=""
    >
      {fullContent}
    </CollapsibleTile>
  );
};