import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Minus, ArrowLeft } from 'lucide-react';
import { LineChart } from './charts/LineChart';
import { BarChart } from './charts/BarChart';
import { getMonthlyData, MonthlyData } from '../../lib/timeAggregation';
import { getSupabase } from '../../lib/supabase';

interface MonthlyDashboardProps {
  onBackToDashboard?: () => void;
}

export const MonthlyDashboard: React.FC<MonthlyDashboardProps> = ({ onBackToDashboard }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

  useEffect(() => {
    loadMonthlyData();
  }, []);

  const loadMonthlyData = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await getMonthlyData(user.id, 6);
      setMonthlyData(data);
      setCurrentMonthIndex(data.length - 1);
    } catch (error) {
      console.error('Error loading monthly data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    if (currentMonthIndex > 0) {
      setCurrentMonthIndex(currentMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < monthlyData.length - 1) {
      setCurrentMonthIndex(currentMonthIndex + 1);
    }
  };

  const currentMonth = monthlyData[currentMonthIndex];
  const previousMonth = currentMonthIndex > 0 ? monthlyData[currentMonthIndex - 1] : null;

  const getChangePercentage = (current: number, previous: number | undefined): number => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getTrendIcon = (change: number) => {
    if (Math.abs(change) < 2) return <Minus size={16} className="text-gray-400" />;
    if (change > 0) return <TrendingUp size={16} className="text-green-400" />;
    return <TrendingDown size={16} className="text-red-400" />;
  };

  const getTrendColor = (change: number) => {
    if (Math.abs(change) < 2) return 'text-gray-400';
    if (change > 0) return 'text-green-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        {onBackToDashboard && (
          <div className="p-4">
            <button
              onClick={onBackToDashboard}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors"
              title="Back to Daily Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
        )}
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Loading monthly data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (monthlyData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100">
        {onBackToDashboard && (
          <div className="p-4">
            <button
              onClick={onBackToDashboard}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors"
              title="Back to Daily Dashboard"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
        )}
        <div className="text-center py-12">
          <Calendar size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Monthly Data Yet</h3>
          <p className="text-gray-400">Start logging workouts, meals, and sleep to see monthly trends</p>
        </div>
      </div>
    );
  }

  const compositeChartData = monthlyData.map(month => ({
    label: `${month.month.slice(0, 3)} ${month.year}`,
    value: month.avg_composite_score
  }));

  const frequencyChartData = monthlyData.map(month => ({
    label: `${month.month.slice(0, 3)} ${month.year}`,
    value: month.avg_frequency_score
  }));

  const restChartData = monthlyData.map(month => ({
    label: `${month.month.slice(0, 3)} ${month.year}`,
    value: month.avg_rest_score
  }));

  const energyChartData = monthlyData.map(month => ({
    label: `${month.month.slice(0, 3)} ${month.year}`,
    value: month.avg_energy_score
  }));

  const effortChartData = monthlyData.map(month => ({
    label: `${month.month.slice(0, 3)} ${month.year}`,
    value: month.avg_effort_score
  }));

  const sessionsBarData = monthlyData.map(month => ({
    label: `${month.month.slice(0, 3)}`,
    value: month.total_sessions,
    target: 20,
    color: month.total_sessions >= 20 ? '#10b981' : '#3b82f6'
  }));

  const caloriesBarData = monthlyData.map(month => ({
    label: `${month.month.slice(0, 3)}`,
    value: month.avg_calories,
    color: '#f59e0b'
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-4 pb-20">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors"
                title="Back to Daily Dashboard"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">Monthly Trends</h2>
              {currentMonth && (
                <p className="text-gray-400 text-sm mt-1">
                  {currentMonth.month} {currentMonth.year}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              disabled={currentMonthIndex === 0}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextMonth}
              disabled={currentMonthIndex === monthlyData.length - 1}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {currentMonth && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Composite Score</span>
                  {previousMonth && (
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(getChangePercentage(currentMonth.avg_composite_score, previousMonth.avg_composite_score))}`}>
                      {getTrendIcon(getChangePercentage(currentMonth.avg_composite_score, previousMonth.avg_composite_score))}
                      <span>{Math.abs(getChangePercentage(currentMonth.avg_composite_score, previousMonth.avg_composite_score)).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">{currentMonth.avg_composite_score.toFixed(0)}</div>
                <div className="text-xs text-gray-500 mt-1">monthly average</div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Workouts</span>
                  {previousMonth && (
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(getChangePercentage(currentMonth.total_sessions, previousMonth.total_sessions))}`}>
                      {getTrendIcon(getChangePercentage(currentMonth.total_sessions, previousMonth.total_sessions))}
                      <span>{Math.abs(currentMonth.total_sessions - previousMonth.total_sessions)}</span>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">{currentMonth.total_sessions}</div>
                <div className="text-xs text-gray-500 mt-1">sessions</div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Avg Calories</span>
                  {previousMonth && (
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(getChangePercentage(currentMonth.avg_calories, previousMonth.avg_calories))}`}>
                      {getTrendIcon(getChangePercentage(currentMonth.avg_calories, previousMonth.avg_calories))}
                      <span>{Math.abs(getChangePercentage(currentMonth.avg_calories, previousMonth.avg_calories)).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">{currentMonth.avg_calories.toFixed(0)}</div>
                <div className="text-xs text-gray-500 mt-1">per day</div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Goal Adherence</span>
                  {previousMonth && (
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(getChangePercentage(currentMonth.goal_adherence_pct, previousMonth.goal_adherence_pct))}`}>
                      {getTrendIcon(getChangePercentage(currentMonth.goal_adherence_pct, previousMonth.goal_adherence_pct))}
                      <span>{Math.abs(getChangePercentage(currentMonth.goal_adherence_pct, previousMonth.goal_adherence_pct)).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">{currentMonth.goal_adherence_pct.toFixed(0)}%</div>
                <div className="text-xs text-gray-500 mt-1">{currentMonth.days_with_data} days logged</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Composite Score Trend</h3>
                <LineChart data={compositeChartData} height={200} color="#8b5cf6" />
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Monthly Sessions</h3>
                <BarChart data={sessionsBarData} height={200} showTarget />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Frequency Score</h3>
                <LineChart data={frequencyChartData} height={180} color="#a855f7" />
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Rest Score</h3>
                <LineChart data={restChartData} height={180} color="#06b6d4" />
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Energy Score</h3>
                <LineChart data={energyChartData} height={180} color="#10b981" />
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Effort Score</h3>
                <LineChart data={effortChartData} height={180} color="#f59e0b" />
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Average Daily Calories</h3>
              <BarChart data={caloriesBarData} height={200} showValues />
            </div>

            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Macros</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{currentMonth.avg_protein_g.toFixed(0)}g</div>
                  <div className="text-sm text-gray-400 mt-1">Avg Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{currentMonth.avg_carbs_g.toFixed(0)}g</div>
                  <div className="text-sm text-gray-400 mt-1">Avg Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{currentMonth.avg_fat_g.toFixed(0)}g</div>
                  <div className="text-sm text-gray-400 mt-1">Avg Fat</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Monthly Summary</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-xl font-bold text-white">{currentMonth.total_volume_lbs.toFixed(0)}</div>
                  <div className="text-xs text-gray-400 mt-1">Total Volume (lbs)</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-xl font-bold text-white">{currentMonth.avg_sleep_hours.toFixed(1)}</div>
                  <div className="text-xs text-gray-400 mt-1">Avg Sleep (hrs)</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-xl font-bold text-white">{(currentMonth.total_sessions / 4.33).toFixed(1)}</div>
                  <div className="text-xs text-gray-400 mt-1">Workouts/Week</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-xl font-bold text-white">{currentMonth.days_with_data}</div>
                  <div className="text-xs text-gray-400 mt-1">Days Tracked</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
