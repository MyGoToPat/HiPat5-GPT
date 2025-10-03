import React, { useState, useEffect } from 'react';
import { PatAvatar } from './PatAvatar';
import { MessageSquare, Mic } from 'lucide-react';
import { FrequencySection } from './dashboard/FrequencySection';
import { RestSection } from './dashboard/RestSection';
import { EnergySection } from './dashboard/EnergySection';
import { EffortSection } from './dashboard/EffortSection';
import { DailySummary } from './dashboard/DailySummary';
import { TimePeriodSelector, TimePeriod } from './dashboard/TimePeriodSelector';
import { WeeklyDashboard } from './dashboard/WeeklyDashboard';
import { MonthlyDashboard } from './dashboard/MonthlyDashboard';
import { MealHistoryList } from './dashboard/MealHistoryList';
import { MetricAlert, CrossMetricInsight } from '../types/metrics';
import { PatMoodCalculator, UserMetrics } from '../utils/patMoodCalculator';
import { getSupabase, getDashboardMetrics, updateDailyActivitySummary, getUserDayBoundaries } from '../lib/supabase';
import type { FoodEntry } from '../types/food';
import { useNavigate, useLocation } from 'react-router-dom';

interface UserMetricsData {
  tdee?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  bmr?: number;
}

interface WorkoutLogData {
  workout_date: string;
  duration_minutes: number;
  workout_type: string;
  volume_lbs?: number;
  avg_rpe?: number;
}

interface SleepLogData {
  sleep_date: string;
  duration_minutes: number;
  quality_score?: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  light_sleep_minutes: number;
}
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
  const [userId, setUserId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<{
    userMetrics: UserMetricsData | null;
    todaysFoodLogs: FoodEntry[];
    totalCalories: number;
    totalMacros: { protein: number; carbs: number; fat: number };
    workoutLogs: WorkoutLogData[];
    sleepLogs: SleepLogData[];
  } | null>(null);

  useEffect(() => {
    setTimePeriod('daily');
  }, [location.key]);
  
  const [alerts, setAlerts] = useState<MetricAlert[]>([
    // Alerts will be loaded from backend in future
  ]);

  // Cross-metric insights will be loaded from backend in future
  const insights: CrossMetricInsight[] = [
    // Cross-metric insights to be loaded from backend
  ];

  // Extracted load function to be reused
  const loadDashboardData = async () => {
    try {
      const supabase = getSupabase();
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      // Store user ID for meal history component
      setUserId(user.data.user.id);

      // Update daily activity summary first (idempotent)
      await updateDailyActivitySummary(user.data.user.id);

      // Get timezone-aware day boundaries (12:01 AM - 11:59:59 PM user local time)
      const dayBoundaries = await getUserDayBoundaries(user.data.user.id);

        // Prepare date ranges for other queries
        const workoutStartDate = new Date();
        workoutStartDate.setDate(workoutStartDate.getDate() - 48); // Last 49 days for heatmap
        const sleepStartDate = new Date();
        sleepStartDate.setDate(sleepStartDate.getDate() - 13); // Last 14 days for sleep

        // Fetch all data in parallel
        const [
          metricsResult,
          mealLogsResult,
          workoutLogsResult,
          sleepLogsResult
        ] = await Promise.all([
          // User metrics
          supabase
            .from('user_metrics')
            .select('*')
            .eq('user_id', user.data.user.id)
            .maybeSingle(),

          // Today's meal logs using timezone-aware boundaries
          // This ensures meals from 12:01 AM to 12:00 PM (midnight) in user's local timezone
          dayBoundaries ? supabase
            .from('meal_logs')
            .select('*')
            .eq('user_id', user.data.user.id)
            .gte('ts', dayBoundaries.day_start)
            .lte('ts', dayBoundaries.day_end)
            .order('ts', { ascending: false }) : Promise.resolve({ data: [], error: null }),

          // Workout logs for dashboard
          supabase
            .from('workout_logs')
            .select('workout_date, duration_minutes, workout_type, volume_lbs, avg_rpe')
            .eq('user_id', user.data.user.id)
            .gte('workout_date', workoutStartDate.toISOString().slice(0, 10))
            .order('workout_date', { ascending: true }),

          // Sleep logs for dashboard
          supabase
            .from('sleep_logs')
            .select('sleep_date, duration_minutes, quality_score, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes')
            .eq('user_id', user.data.user.id)
            .gte('sleep_date', sleepStartDate.toISOString().slice(0, 10))
            .order('sleep_date', { ascending: true })
        ]);

        // Calculate totals from meal_logs (totals field contains the macros)
        const mealLogs = mealLogsResult.data || [];
        const totalCalories = mealLogs.reduce((sum, log) => sum + (log.totals?.kcal || 0), 0);
        const totalMacros = mealLogs.reduce(
          (totals, log) => ({
            protein: totals.protein + (log.totals?.protein_g || 0),
            carbs: totals.carbs + (log.totals?.carbs_g || 0),
            fat: totals.fat + (log.totals?.fat_g || 0)
          }),
          { protein: 0, carbs: 0, fat: 0 }
        );

        setDashboardData({
          userMetrics: metricsResult.data,
          todaysFoodLogs: mealLogs,
          totalCalories,
          totalMacros,
          workoutLogs: workoutLogsResult.data || [],
          sleepLogs: sleepLogsResult.data || []
        });

      console.log('Dashboard data loaded:', { workouts: workoutLogsResult.data?.length, sleep: sleepLogsResult.data?.length });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Mock user metrics for mood calculation
  const userMetrics: UserMetrics = {
    workoutStreak: 0,
    sleepQuality: 0,
    proteinTarget: 0,
    lastWorkout: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago (no recent workouts)
    missedWorkouts: 0,
    recentPRs: 0,
    consistencyScore: 0
  };

  // Calculate Pat's current mood
  const patMood = PatMoodCalculator.calculateMood(userMetrics, alerts);
  const moodMessage = PatMoodCalculator.getMoodMessage(patMood);

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (timePeriod === 'weekly') {
    return <WeeklyDashboard onBackToDashboard={() => setTimePeriod('daily')} />;
  }

  if (timePeriod === 'monthly') {
    return <MonthlyDashboard onBackToDashboard={() => setTimePeriod('daily')} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 relative pt-[44px]">
      <div className="relative">
        <div className="flex justify-center pt-4 pb-2">
          <TimePeriodSelector selected={timePeriod} onChange={setTimePeriod} />
        </div>
        {/* Animated Pat Avatar in corner */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={() => navigate('/chat')}
            className="hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-950 rounded-full group relative min-h-[44px] min-w-[44px]"
          >
            <PatAvatar size={48} mood={patMood} interactionType="chat" />
            
            
            {/* Mood tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 max-w-xs sm:max-w-none">
              {moodMessage}
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          </button>
        </div>
        
        {/* Main Content */}
        <div className="py-4 pb-20">
          <div className="px-4 sm:px-6">
            {/* Daily Summary */}
            <DailySummary 
              totalCalories={dashboardData?.totalCalories || 0}
              targetCalories={dashboardData?.userMetrics?.tdee || 2200}
              proteinTarget={dashboardData?.userMetrics?.protein_g || 150}
              currentProtein={dashboardData?.totalMacros?.protein || 0}
            />
          </div>
          
          <div className="px-4 sm:px-6">
            {/* Minimalist Dashboard Grid - Mobile-First Responsive Layout */}
            <div className="grid gap-4 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <FrequencySection workouts={dashboardData?.workoutLogs || []} />
              <RestSection sleepLogs={dashboardData?.sleepLogs || []} />
              <EnergySection
                energyData={dashboardData && dashboardData.totalMacros ? {
                  date: new Date().toISOString().split('T')[0],
                  calories: dashboardData.totalCalories || 0,
                  protein_g: dashboardData.totalMacros?.protein || 0,
                  carb_g: dashboardData.totalMacros?.carbs || 0,
                  fat_g: dashboardData.totalMacros?.fat || 0,
                  salt_g: 2.3, // Mock for now
                  water_l: 3.2, // Mock for now
                  first_meal_time: '08:30', // Mock for now
                  last_meal_time: '20:15', // Mock for now
                  tdee: dashboardData.userMetrics?.tdee || 2200,
                  bmr: dashboardData.userMetrics?.bmr || 1800
                } : undefined}
                targetProtein={dashboardData?.userMetrics?.protein_g}
                targetCarbs={dashboardData?.userMetrics?.carbs_g}
                targetFat={dashboardData?.userMetrics?.fat_g}
                targetCalories={dashboardData?.userMetrics?.tdee}
              />
              <EffortSection workouts={dashboardData?.workoutLogs || []} />
            </div>

            {/* Meal History */}
            {userId && (
              <div className="mt-6">
                <MealHistoryList
                  userId={userId}
                  onMealDeleted={loadDashboardData}
                />
              </div>
            )}

            {/* Essential Actions - Restored CTAs */}
            <div className="mt-6 bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-800">
              <div className="flex items-center justify-center gap-3">
                {/* Chat with Pat - Opens voice page with conversation bubbles */}
                <button
                  onClick={() => navigate('/voice')}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium transition-all duration-200 min-h-[44px] flex-1 max-w-[200px] justify-center"
                >
                  <MessageSquare size={20} />
                  <span className="text-sm">Chat with Pat</span>
                </button>
                {/* Talk with Pat - Same as Chat with Pat (voice interface) */}
                <button
                  onClick={() => navigate('/voice')}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-medium transition-all duration-200 min-h-[44px] flex-1 max-w-[200px] justify-center"
                >
                  <Mic size={20} />
                  <span className="text-sm">Talk with Pat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      
      {/* Fixed Footer - 40px height */}
      <div className="fixed bottom-0 left-0 right-0 h-[40px] bg-gray-900 border-t border-gray-800 flex items-center justify-center z-30">
        <p className="text-xs text-gray-500">© 2024 Pat AI Assistant</p>
      </div>
      </div>
    </div>
  );
};