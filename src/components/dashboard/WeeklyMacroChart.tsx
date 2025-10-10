import React from 'react';
import { BarChart } from './charts/BarChart';

interface DayData {
  date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface WeeklyMacroChartProps {
  dailyData: DayData[];
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export const WeeklyMacroChart: React.FC<WeeklyMacroChartProps> = ({
  dailyData,
  targetKcal,
  targetProtein,
  targetCarbs,
  targetFat
}) => {
  // Prepare calorie chart data
  const calorieChartData = dailyData.map(day => {
    const date = new Date(day.date);
    const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
    const isOverTarget = day.kcal > targetKcal;

    return {
      label,
      value: day.kcal,
      target: targetKcal,
      color: isOverTarget ? '#ef4444' : day.kcal >= targetKcal * 0.9 ? '#10b981' : '#3b82f6'
    };
  });

  // Prepare macro chart data (stacked)
  const macroChartData = dailyData.map(day => {
    const date = new Date(day.date);
    const label = date.toLocaleDateString('en-US', { weekday: 'short' });

    return {
      label,
      protein: day.protein_g,
      carbs: day.carbs_g,
      fat: day.fat_g
    };
  });

  // Calculate weekly totals
  const weeklyTotals = dailyData.reduce((acc, day) => ({
    kcal: acc.kcal + day.kcal,
    protein_g: acc.protein_g + day.protein_g,
    carbs_g: acc.carbs_g + day.carbs_g,
    fat_g: acc.fat_g + day.fat_g,
    fiber_g: acc.fiber_g + day.fiber_g
  }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });

  const weeklyTargets = {
    kcal: targetKcal * 7,
    protein_g: targetProtein * 7,
    carbs_g: targetCarbs * 7,
    fat_g: targetFat * 7
  };

  const weeklyDeficit = weeklyTargets.kcal - weeklyTotals.kcal;

  return (
    <div className="space-y-6">
      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <div className="text-xs text-gray-400 mb-1">Total Calories</div>
          <div className="text-2xl font-bold text-white">{Math.round(weeklyTotals.kcal).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">
            Target: {Math.round(weeklyTargets.kcal).toLocaleString()}
          </div>
          <div className={`text-xs font-medium mt-1 ${weeklyDeficit > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {weeklyDeficit > 0 ? '-' : '+'}{Math.abs(Math.round(weeklyDeficit)).toLocaleString()} cal {weeklyDeficit > 0 ? 'deficit' : 'surplus'}
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <div className="text-xs text-red-400 mb-1">Protein</div>
          <div className="text-2xl font-bold text-white">{Math.round(weeklyTotals.protein_g)}g</div>
          <div className="text-xs text-gray-500 mt-1">
            Target: {Math.round(weeklyTargets.protein_g)}g
          </div>
          <div className={`text-xs font-medium mt-1 ${
            weeklyTotals.protein_g >= weeklyTargets.protein_g ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {weeklyTotals.protein_g >= weeklyTargets.protein_g ? '✓ Goal met' : `${Math.round(weeklyTargets.protein_g - weeklyTotals.protein_g)}g short`}
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <div className="text-xs text-blue-400 mb-1">Carbs</div>
          <div className="text-2xl font-bold text-white">{Math.round(weeklyTotals.carbs_g)}g</div>
          <div className="text-xs text-gray-500 mt-1">
            Target: {Math.round(weeklyTargets.carbs_g)}g
          </div>
          <div className={`text-xs font-medium mt-1 ${
            Math.abs(weeklyTotals.carbs_g - weeklyTargets.carbs_g) < weeklyTargets.carbs_g * 0.1 ? 'text-green-400' : 'text-gray-400'
          }`}>
            {Math.round(weeklyTotals.carbs_g - weeklyTargets.carbs_g > 0 ? '+' : '')}{Math.round(weeklyTotals.carbs_g - weeklyTargets.carbs_g)}g
          </div>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <div className="text-xs text-yellow-400 mb-1">Fat</div>
          <div className="text-2xl font-bold text-white">{Math.round(weeklyTotals.fat_g)}g</div>
          <div className="text-xs text-gray-500 mt-1">
            Target: {Math.round(weeklyTargets.fat_g)}g
          </div>
          <div className={`text-xs font-medium mt-1 ${
            Math.abs(weeklyTotals.fat_g - weeklyTargets.fat_g) < weeklyTargets.fat_g * 0.1 ? 'text-green-400' : 'text-gray-400'
          }`}>
            {Math.round(weeklyTotals.fat_g - weeklyTargets.fat_g > 0 ? '+' : '')}{Math.round(weeklyTotals.fat_g - weeklyTargets.fat_g)}g
          </div>
        </div>
      </div>

      {/* Daily Calorie Chart */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Caloric Intake</h3>
        <BarChart
          data={calorieChartData}
          height={300}
          showTarget={true}
        />
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>On target (90-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Under target (&lt;90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Over target (&gt;100%)</span>
          </div>
        </div>
      </div>

      {/* Daily Macro Breakdown */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Macro Breakdown</h3>
        <div className="space-y-4">
          {macroChartData.map((day, idx) => {
            const totalGrams = day.protein + day.carbs + day.fat;
            const proteinPct = (day.protein / totalGrams) * 100;
            const carbsPct = (day.carbs / totalGrams) * 100;
            const fatPct = (day.fat / totalGrams) * 100;

            return (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 font-medium">{day.label}</span>
                  <span className="text-gray-500">
                    {day.protein}p / {day.carbs}c / {day.fat}f
                  </span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-gray-800">
                  <div
                    className="bg-red-500"
                    style={{ width: `${proteinPct}%` }}
                    title={`Protein: ${day.protein}g (${proteinPct.toFixed(1)}%)`}
                  ></div>
                  <div
                    className="bg-blue-500"
                    style={{ width: `${carbsPct}%` }}
                    title={`Carbs: ${day.carbs}g (${carbsPct.toFixed(1)}%)`}
                  ></div>
                  <div
                    className="bg-yellow-500"
                    style={{ width: `${fatPct}%` }}
                    title={`Fat: ${day.fat}g (${fatPct.toFixed(1)}%)`}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Protein</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Carbs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Fat</span>
          </div>
        </div>
      </div>
    </div>
  );
};
