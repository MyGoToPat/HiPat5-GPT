import React from 'react';
import { Scale, TrendingDown, TrendingUp, Minus, Target } from 'lucide-react';

interface WeightProgressCardProps {
  currentWeightKg: number;
  goalWeightKg?: number;
  weeklyChangeKg?: number;
  startWeightKg?: number;
  useMetric?: boolean;
  onLogWeight?: () => void;
  className?: string;
}

export const WeightProgressCard: React.FC<WeightProgressCardProps> = ({
  currentWeightKg,
  goalWeightKg,
  weeklyChangeKg = 0,
  startWeightKg,
  useMetric = false,
  onLogWeight,
  className = ''
}) => {
  const formatWeight = (kg: number) => {
    return useMetric ? `${kg.toFixed(1)} kg` : `${(kg * 2.20462).toFixed(1)} lbs`;
  };

  const getTrendIcon = () => {
    if (Math.abs(weeklyChangeKg) < 0.2) return <Minus size={16} className="text-gray-400" />;
    if (weeklyChangeKg > 0) return <TrendingUp size={16} className="text-red-400" />;
    return <TrendingDown size={16} className="text-green-400" />;
  };

  const getTrendColor = () => {
    if (Math.abs(weeklyChangeKg) < 0.2) return 'text-gray-400';
    if (weeklyChangeKg > 0) return 'text-red-400';
    return 'text-green-400';
  };

  const calculateProgress = () => {
    if (!goalWeightKg || !startWeightKg) return 0;
    const totalChange = startWeightKg - goalWeightKg;
    const currentChange = startWeightKg - currentWeightKg;
    return Math.min(Math.max((currentChange / totalChange) * 100, 0), 100);
  };

  const progress = calculateProgress();
  const remainingKg = goalWeightKg ? Math.abs(currentWeightKg - goalWeightKg) : 0;

  const estimateDaysToGoal = () => {
    if (!goalWeightKg || Math.abs(weeklyChangeKg) < 0.1) return null;
    const weeksToGoal = remainingKg / Math.abs(weeklyChangeKg);
    const daysToGoal = Math.round(weeksToGoal * 7);
    return daysToGoal;
  };

  const daysToGoal = estimateDaysToGoal();

  return (
    <div className={`bg-gradient-to-br from-blue-600/10 to-purple-600/10 rounded-2xl p-6 border border-blue-500/20 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Weight Progress</h3>
        </div>
        {onLogWeight && (
          <button
            onClick={onLogWeight}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Log Weight
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-bold text-white">
            {formatWeight(currentWeightKg)}
          </div>
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">
              {weeklyChangeKg !== 0 ? formatWeight(Math.abs(weeklyChangeKg)) : 'No change'}
            </span>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          {weeklyChangeKg !== 0 && (
            <span>{weeklyChangeKg > 0 ? 'Up' : 'Down'} this week</span>
          )}
        </div>

        {goalWeightKg && (
          <>
            <div className="bg-gray-900/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Goal</span>
                <span className="text-white font-medium">{formatWeight(goalWeightKg)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Remaining</span>
                <span className="text-orange-400 font-medium">{formatWeight(remainingKg)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Progress</span>
                <span className="text-blue-400 font-medium">{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {daysToGoal && daysToGoal > 0 && daysToGoal < 365 && (
              <div className="flex items-center gap-2 p-3 bg-green-600/10 border border-green-500/20 rounded-lg">
                <Target size={16} className="text-green-400" />
                <div className="text-sm">
                  <span className="text-green-300 font-medium">{daysToGoal} days</span>
                  <span className="text-gray-400"> to goal at current rate</span>
                </div>
              </div>
            )}
          </>
        )}

        {!goalWeightKg && (
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400">Set a goal weight to track progress</p>
          </div>
        )}
      </div>
    </div>
  );
};
