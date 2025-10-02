import React from 'react';
import { Flame, CheckCircle, Utensils, Dumbbell, Scale } from 'lucide-react';

interface TodaysSnapshotProps {
  caloriesEaten: number;
  caloriesTarget: number;
  proteinEaten: number;
  proteinTarget: number;
  carbsEaten: number;
  carbsTarget: number;
  fatEaten: number;
  fatTarget: number;
  mealsLogged: number;
  workoutsLogged: number;
  weightLoggedThisWeek: boolean;
  currentStreak?: number;
  className?: string;
}

export const TodaysSnapshot: React.FC<TodaysSnapshotProps> = ({
  caloriesEaten,
  caloriesTarget,
  proteinEaten,
  proteinTarget,
  carbsEaten,
  carbsTarget,
  fatEaten,
  fatTarget,
  mealsLogged,
  workoutsLogged,
  weightLoggedThisWeek,
  currentStreak = 0,
  className = ''
}) => {
  const caloriesRemaining = Math.max(0, caloriesTarget - caloriesEaten);
  const caloriesPercent = caloriesTarget > 0 ? (caloriesEaten / caloriesTarget) * 100 : 0;

  const getCalorieStatus = () => {
    if (caloriesPercent < 70) return { color: 'text-blue-400', ring: 'ring-blue-500', bg: 'from-blue-600/20 to-blue-700/10' };
    if (caloriesPercent < 90) return { color: 'text-green-400', ring: 'ring-green-500', bg: 'from-green-600/20 to-green-700/10' };
    if (caloriesPercent < 110) return { color: 'text-yellow-400', ring: 'ring-yellow-500', bg: 'from-yellow-600/20 to-yellow-700/10' };
    return { color: 'text-red-400', ring: 'ring-red-500', bg: 'from-red-600/20 to-red-700/10' };
  };

  const status = getCalorieStatus();

  const getMacroPercent = (eaten: number, target: number) => {
    return target > 0 ? Math.min((eaten / target) * 100, 100) : 0;
  };

  const macros = [
    { name: 'Protein', eaten: proteinEaten, target: proteinTarget, color: 'from-red-500 to-orange-500', bgColor: 'bg-red-500/20' },
    { name: 'Carbs', eaten: carbsEaten, target: carbsTarget, color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-500/20' },
    { name: 'Fat', eaten: fatEaten, target: fatTarget, color: 'from-yellow-500 to-amber-500', bgColor: 'bg-yellow-500/20' }
  ];

  return (
    <div className={`bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden ${className}`}>
      <div className="p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Flame size={20} className="text-orange-400" />
          Today at a Glance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`bg-gradient-to-br ${status.bg} rounded-xl p-6 border border-gray-800`}>
            <div className="text-center">
              <div className="relative inline-flex mb-4">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-800"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${Math.min(caloriesPercent, 100) * 3.52} 352`}
                    className={status.color}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-3xl font-bold ${status.color}`}>
                    {caloriesRemaining}
                  </div>
                  <div className="text-xs text-gray-400">cal left</div>
                </div>
              </div>
              <div className="text-sm text-gray-400">
                {caloriesEaten} / {caloriesTarget} cal
              </div>
              {caloriesPercent >= 90 && caloriesPercent < 110 && (
                <div className="text-xs text-green-400 mt-1">On track!</div>
              )}
              {caloriesPercent >= 110 && (
                <div className="text-xs text-red-400 mt-1">Over target</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <CheckCircle size={16} />
                Today's Progress
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Utensils size={14} className="text-orange-400" />
                    <span className="text-sm text-gray-300">Meals Logged</span>
                  </div>
                  <span className="text-white font-medium">{mealsLogged}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell size={14} className="text-purple-400" />
                    <span className="text-sm text-gray-300">Workouts</span>
                  </div>
                  <span className="text-white font-medium">{workoutsLogged}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale size={14} className="text-blue-400" />
                    <span className="text-sm text-gray-300">Weight (This Week)</span>
                  </div>
                  <span className={`font-medium ${weightLoggedThisWeek ? 'text-green-400' : 'text-gray-500'}`}>
                    {weightLoggedThisWeek ? '✓' : '—'}
                  </span>
                </div>
                {currentStreak > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                    <span className="text-sm text-gray-300">Current Streak</span>
                    <div className="flex items-center gap-1">
                      <span className="text-orange-400 font-bold text-lg">{currentStreak}</span>
                      <span className="text-sm text-gray-400">days 🔥</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-400 mb-3">Macro Progress</h3>
              <div className="space-y-3">
                {macros.map((macro) => {
                  const percent = getMacroPercent(macro.eaten, macro.target);
                  return (
                    <div key={macro.name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">{macro.name}</span>
                        <span className="text-white font-medium">
                          {Math.round(macro.eaten)}g / {Math.round(macro.target)}g
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${macro.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
