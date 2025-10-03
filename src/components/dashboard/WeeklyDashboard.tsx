import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Minus, ArrowLeft } from 'lucide-react';
import { LineChart } from './charts/LineChart';
import { BarChart } from './charts/BarChart';
import { getWeeklyData, getWeekBoundaries, WeeklyData } from '../../lib/timeAggregation';
import { getSupabase } from '../../lib/supabase';

interface WeeklyDashboardProps {
  onBackToDashboard?: () => void;
}

export const WeeklyDashboard: React.FC<WeeklyDashboardProps> = ({ onBackToDashboard }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const [weekBoundaries, setWeekBoundaries] = useState<{ week_start: string; week_end: string } | null>(null);

  useEffect(() => {
    loadWeeklyData();
  }, []);

  const loadWeeklyData = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await getWeeklyData(user.id, 12);
      setWeeklyData(data);

      const boundaries = await getWeekBoundaries(user.id);
      setWeekBoundaries(boundaries);

      setCurrentWeekIndex(data.length - 1);
    } catch (error) {
      console.error('Error loading weekly data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const handleNextWeek = () => {
    if (currentWeekIndex < weeklyData.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  const currentWeek = weeklyData[currentWeekIndex];
  const previousWeek = currentWeekIndex > 0 ? weeklyData[currentWeekIndex - 1] : null;

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
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading weekly data...</p>
        </div>
      </div>
    );
  }

  if (weeklyData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
        <div className="text-center py-12">
          <Calendar size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Weekly Data Yet</h3>
          <p className="text-gray-400">Start logging workouts, meals, and sleep to see weekly trends</p>
        </div>
      </div>
    );
  }

  const frequencyChartData = weeklyData.map(week => ({
    label: new Date(week.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: week.frequency_score
  }));

  const restChartData = weeklyData.map(week => ({
    label: new Date(week.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: week.rest_score
  }));

  const energyChartData = weeklyData.map(week => ({
    label: new Date(week.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: week.energy_score
  }));

  const effortChartData = weeklyData.map(week => ({
    label: new Date(week.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: week.effort_score
  }));

  const compositeChartData = weeklyData.map(week => ({
    label: new Date(week.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: week.composite_score
  }));

  const sessionsBarData = weeklyData.slice(-8).map(week => ({
    label: new Date(week.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: week.sessions_count,
    target: 5,
    color: week.sessions_count >= 5 ? '#10b981' : '#3b82f6'
  }));

  const caloriesBarData = weeklyData.slice(-8).map(week => ({
    label: new Date(week.week_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: week.avg_calories,
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
              <h2 className="text-2xl font-bold text-white">Weekly Trends</h2>
              {currentWeek && (
                <p className="text-gray-400 text-sm mt-1">
                {new Date(currentWeek.week_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                {' - '}
                  {new Date(currentWeek.week_end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousWeek}
              disabled={currentWeekIndex === 0}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextWeek}
              disabled={currentWeekIndex === weeklyData.length - 1}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {currentWeek && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Composite Score</span>
                  {previousWeek && (
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(getChangePercentage(currentWeek.composite_score, previousWeek.composite_score))}`}>
                      {getTrendIcon(getChangePercentage(currentWeek.composite_score, previousWeek.composite_score))}
                      <span>{Math.abs(getChangePercentage(currentWeek.composite_score, previousWeek.composite_score)).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">{currentWeek.composite_score.toFixed(0)}</div>
                <div className="text-xs text-gray-500 mt-1">out of 100</div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Workouts</span>
                  {previousWeek && (
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(getChangePercentage(currentWeek.sessions_count, previousWeek.sessions_count))}`}>
                      {getTrendIcon(getChangePercentage(currentWeek.sessions_count, previousWeek.sessions_count))}
                      <span>{Math.abs(currentWeek.sessions_count - previousWeek.sessions_count)}</span>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">{currentWeek.sessions_count}</div>
                <div className="text-xs text-gray-500 mt-1">sessions</div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Avg Calories</span>
                  {previousWeek && (
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(getChangePercentage(currentWeek.avg_calories, previousWeek.avg_calories))}`}>
                      {getTrendIcon(getChangePercentage(currentWeek.avg_calories, previousWeek.avg_calories))}
                      <span>{Math.abs(getChangePercentage(currentWeek.avg_calories, previousWeek.avg_calories)).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">{currentWeek.avg_calories.toFixed(0)}</div>
                <div className="text-xs text-gray-500 mt-1">per day</div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Avg Sleep</span>
                  {previousWeek && (
                    <div className={`flex items-center gap-1 text-xs ${getTrendColor(getChangePercentage(currentWeek.avg_sleep_hours, previousWeek.avg_sleep_hours))}`}>
                      {getTrendIcon(getChangePercentage(currentWeek.avg_sleep_hours, previousWeek.avg_sleep_hours))}
                      <span>{Math.abs(getChangePercentage(currentWeek.avg_sleep_hours, previousWeek.avg_sleep_hours)).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-white">{currentWeek.avg_sleep_hours.toFixed(1)}</div>
                <div className="text-xs text-gray-500 mt-1">hours/night</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Composite Score Trend</h3>
                <LineChart data={compositeChartData} height={200} color="#8b5cf6" />
              </div>

              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Weekly Sessions</h3>
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

            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Average Daily Calories</h3>
              <BarChart data={caloriesBarData} height={200} showValues />
            </div>

            <div className="mt-6 bg-gray-900/50 rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Weekly Macros</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{currentWeek.avg_protein_g.toFixed(0)}g</div>
                  <div className="text-sm text-gray-400 mt-1">Avg Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{currentWeek.avg_carbs_g.toFixed(0)}g</div>
                  <div className="text-sm text-gray-400 mt-1">Avg Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{currentWeek.avg_fat_g.toFixed(0)}g</div>
                  <div className="text-sm text-gray-400 mt-1">Avg Fat</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
