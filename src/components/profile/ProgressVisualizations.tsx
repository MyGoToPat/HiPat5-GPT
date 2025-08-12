import React from 'react';
import { TrendingUp, Calendar, Target, Zap } from 'lucide-react';

export const ProgressVisualizations: React.FC = () => {
  // Mock data for visualizations
  const weeklyStats = {
    workouts: { current: 4, target: 5, change: +15 },
    sleep: { current: 7.2, target: 8, change: -5 },
    protein: { current: 165, target: 180, change: +12 },
    calories: { current: 2150, target: 2200, change: -2 }
  };

  const monthlyTrends = [
    { week: 'W1', value: 85 },
    { week: 'W2', value: 78 },
    { week: 'W3', value: 92 },
    { week: 'W4', value: 88 }
  ];

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={20} className="text-green-400" />
        <h3 className="text-lg font-semibold text-white">Progress Overview</h3>
      </div>

      {/* Weekly Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Workouts</span>
            <Target size={14} className="text-orange-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">{weeklyStats.workouts.current}</span>
            <span className="text-gray-400 text-sm">/{weeklyStats.workouts.target}</span>
          </div>
          <div className={`text-xs ${getChangeColor(weeklyStats.workouts.change)} flex items-center gap-1 mt-1`}>
            <span>{getChangeIcon(weeklyStats.workouts.change)}</span>
            <span>{Math.abs(weeklyStats.workouts.change)}% vs last week</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Sleep</span>
            <Calendar size={14} className="text-blue-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">{weeklyStats.sleep.current}h</span>
            <span className="text-gray-400 text-sm">/{weeklyStats.sleep.target}h</span>
          </div>
          <div className={`text-xs ${getChangeColor(weeklyStats.sleep.change)} flex items-center gap-1 mt-1`}>
            <span>{getChangeIcon(weeklyStats.sleep.change)}</span>
            <span>{Math.abs(weeklyStats.sleep.change)}% vs last week</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Protein</span>
            <Zap size={14} className="text-green-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">{weeklyStats.protein.current}g</span>
            <span className="text-gray-400 text-sm">/{weeklyStats.protein.target}g</span>
          </div>
          <div className={`text-xs ${getChangeColor(weeklyStats.protein.change)} flex items-center gap-1 mt-1`}>
            <span>{getChangeIcon(weeklyStats.protein.change)}</span>
            <span>{Math.abs(weeklyStats.protein.change)}% vs last week</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Calories</span>
            <Target size={14} className="text-yellow-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-white">{weeklyStats.calories.current}</span>
            <span className="text-gray-400 text-sm">/{weeklyStats.calories.target}</span>
          </div>
          <div className={`text-xs ${getChangeColor(weeklyStats.calories.change)} flex items-center gap-1 mt-1`}>
            <span>{getChangeIcon(weeklyStats.calories.change)}</span>
            <span>{Math.abs(weeklyStats.calories.change)}% vs last week</span>
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-4">Monthly Consistency Score</h4>
        <div className="flex items-end justify-between h-24 gap-2">
          {monthlyTrends.map((week) => ( // eslint-disable-next-line react/jsx-key
            <div key={week.week} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all duration-500 hover:from-blue-500 hover:to-blue-300"
                style={{ height: `${week.value}%` }}
              />
              <span className="text-xs text-gray-400 mt-2">{week.week}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
          <span>Consistency Score</span>
          <span className="text-blue-400">88% average</span>
        </div>
      </div>

      {/* Goal Progress */}
      <div className="mt-4 p-4 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-purple-300 font-medium text-sm">Current Goal</span>
          <span className="text-purple-200 text-xs">75% complete</span>
        </div>
        <p className="text-purple-100 text-sm mb-3">Maintain 5 workouts per week for 4 weeks</p>
        <div className="w-full bg-purple-900/50 rounded-full h-2">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: '75%' }} />
        </div>
      </div>
    </div>
  );
};