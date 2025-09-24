import React from 'react';
import { Dumbbell, TrendingUp, Award, Activity } from 'lucide-react';
import { VolumeProgressChart } from './VolumeProgressChart';
import { EffortData } from '../../types/metrics';
import { CollapsibleTile } from './CollapsibleTile';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

interface EffortSectionProps {
  workouts?: Array<{
    workout_date: string;
    duration_minutes: number;
    workout_type: string;
    volume_lbs?: number;
    avg_rpe?: number;
  }>;
  isLoading?: boolean;
  error?: string | null;
}

export const EffortSection: React.FC<EffortSectionProps> = ({ 
  workouts = [], 
  isLoading = false, 
  error = null 
}) => {
  // Process live workout data
  const data = Array.isArray(workouts) ? workouts : [];
  
  // Calculate actual metrics from data
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10);
  
  const thisWeekWorkouts = data.filter(workout => 
    workout.workout_date >= startOfWeekStr
  );
  
  const weeklyVolume = thisWeekWorkouts.reduce((total, workout) => {
    return total + (workout.volume_lbs || 0);
  }, 0);
  
  const recentPRs = 0; // Would need PR tracking system
  const avgRPE = thisWeekWorkouts.length > 0 
    ? thisWeekWorkouts.reduce((sum, w) => sum + (w.avg_rpe || 0), 0) / thisWeekWorkouts.length 
    : 0;

  // Transform data for VolumeProgressChart component
  const transformedData: EffortData[] = data.map(workout => ({
    session_id: `${workout.workout_date}-session`,
    exercise: workout.workout_type,
    sets: 1, // Aggregated per workout
    reps: 1,
    weight_lbs: workout.volume_lbs || 0,
    rpe: workout.avg_rpe || 0,
    rest_sec: 0,
    muscle_group: 'mixed'
  }));

  // Guard against loading and error states
  if (isLoading) {
    return (
      <div style={{ position: 'relative' }}>
        <DataSourceBadge source="live" />
        <CollapsibleTile
          title="Effort"
          icon={Dumbbell}
          iconColor="text-orange-400"
          hoverColor="border-orange-600"
          condensedContent={
            <div className="text-center p-2">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-gray-400">Loading effort...</p>
            </div>
          }
          className=""
        >
          <div className="text-center py-8">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading effort data...</p>
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
          title="Effort"
          icon={Dumbbell}
          iconColor="text-orange-400"
          hoverColor="border-orange-600"
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
      {/* Weekly Volume */}
      <div className="mb-3 sm:mb-4">
        <div className="text-xl sm:text-2xl font-bold text-white mb-1">
          {weeklyVolume > 0 ? (weeklyVolume / 1000).toFixed(1) : '0'}<span className="text-sm sm:text-lg text-gray-400">k</span>
        </div>
        <p className="text-xs sm:text-sm text-gray-400">lbs this week</p>
        {weeklyVolume > 0 && (
          <div className="flex items-center justify-center gap-1 text-xs text-orange-400 mt-1">
            <TrendingUp size={12} />
            <span>Track more to see trends</span>
          </div>
        )}
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
          <span className="text-gray-400">RPE {avgRPE > 0 ? avgRPE.toFixed(1) : '0'}</span>
        </div>
      </div>
    </div>
  );

  const fullContent = (
    <>
      {condensedContent}
      
      {effortData.length > 0 ? (
      {data.length > 0 ? (
        <>
          {/* Volume Progress Bar */}
          <div className="mb-4 mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span>Weekly Progress</span>
              <span>Building data</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                style={{ width: '25%' }}
              />
            </div>
          </div>

          {/* Volume Progress Chart */}
          <VolumeProgressChart data={transformedData} />
          
          {/* Recent workout summary */}
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={14} className="text-orange-400" />
              <span className="text-orange-300 text-sm font-medium">Latest Session</span>
            </div>
            <p className="text-white text-sm">
              {thisWeekWorkouts.length} workouts this week
            </p>
            <p className="text-gray-400 text-xs">
              {weeklyVolume > 0 ? `${weeklyVolume.toLocaleString()} lbs total volume` : 'Keep tracking for insights'}
            </p>
          </div>
        </>
      ) : (
        <div className="mt-4 text-center py-8">
          <Dumbbell size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-2">No workout data yet</p>
          <p className="text-gray-500 text-xs">Start logging workouts to track your effort</p>
        </div>
      )}
    </>
  );

  return (
    <div style={{ position: 'relative' }}>
      <DataSourceBadge source="live" />
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
    </div>
  );
};