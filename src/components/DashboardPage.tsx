import React, { useState, useEffect } from 'react';
import { PatAvatar } from './PatAvatar';
import { MessageSquare, Mic } from 'lucide-react';
import { MessageSquare, Mic } from 'lucide-react';
import { FrequencySection } from './dashboard/FrequencySection';
import { RestSection } from './dashboard/RestSection';
import { EnergySection } from './dashboard/EnergySection';
import { EffortSection } from './dashboard/EffortSection';
import { DailySummary } from './dashboard/DailySummary';
import { MetricAlert, CrossMetricInsight } from '../types/metrics';
import { PatMoodCalculator, UserMetrics } from '../utils/patMoodCalculator';
import { getSupabase } from '../lib/supabase';
import type { FoodEntry } from '../types/food';
import { useNavigate } from 'react-router-dom';


interface UserMetricsData {
  tdee?: number;
  protein_g?: number;
  bmr?: number;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    userMetrics: UserMetricsData | null;
    todaysFoodLogs: FoodEntry[];
    totalCalories: number;
    totalMacros: { protein: number; carbs: number; fat: number };
  } | null>(null);
  
  // Mock alerts data
  const [alerts, setAlerts] = useState<MetricAlert[]>([
    {
      id: '1',
      type: 'pr_achieved',
      message: 'New PR achieved! Bench Press: 185 lbs × 8 reps',
      severity: 'info',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      dismissed: false
    },
    {
      id: '2',
      type: 'consistency_nudge',
      message: 'You missed 2 scheduled workouts this week. Stay consistent!',
      severity: 'warning',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      dismissed: false
    },
    {
      id: '3',
      type: 'sleep_debt',
      message: 'Sleep debt detected: Average 5.8h for last 3 nights',
      severity: 'warning',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      dismissed: false
    },
    {
      id: '4',
      type: 'protein_insufficient',
      message: 'Protein intake below target: 1.2g/kg vs 1.6g/kg goal',
      severity: 'info',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      dismissed: true
    }
  ]);

  // Mock insights data
  const insights: CrossMetricInsight[] = [
    {
      id: '1',
      title: 'Sleep Quality vs Workout Performance',
      description: 'Better sleep quality correlates with 15% higher training volume',
      correlation: 73,
      trend: 'positive',
      actionable: true
    },
    {
      id: '2',
      title: 'Protein Intake vs Recovery',
      description: 'Higher protein days show 20% faster recovery metrics',
      correlation: 68,
      trend: 'positive',
      actionable: true
    },
    {
      id: '3',
      title: 'Training Frequency vs Sleep Consistency',
      description: 'More frequent training improves sleep schedule regularity',
      correlation: 45,
      trend: 'positive',
      actionable: false
    }
  ];

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const supabase = getSupabase();
        const user = await supabase.auth.getUser();
        if (!user.data.user) return;

        // Get user metrics
        const { data: metrics } = await supabase
          .from('user_metrics')
          .select('*')
          .eq('user_id', user.data.user.id)
          .maybeSingle();

        // Get today's food logs
        const today = new Date().toISOString().split('T')[0];
        const { data: foodLogs } = await supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', user.data.user.id)
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lt('created_at', `${today}T23:59:59.999Z`)
          .order('created_at', { ascending: false });

        // Calculate totals
        const totalCalories = (foodLogs || []).reduce((sum, log) => sum + (log.macros?.kcal || 0), 0);
        const totalMacros = (foodLogs || []).reduce(
          (totals, log) => ({
            protein: totals.protein + (log.macros?.protein_g || 0),
            carbs: totals.carbs + (log.macros?.carbs_g || 0),
            fat: totals.fat + (log.macros?.fat_g || 0)
          }),
          { protein: 0, carbs: 0, fat: 0 }
        );

        setDashboardData({
          userMetrics: metrics,
          todaysFoodLogs: foodLogs || [],
          totalCalories,
          totalMacros
        });

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Mock user metrics for mood calculation
  const userMetrics: UserMetrics = {
    workoutStreak: 5,
    sleepQuality: 82,
    proteinTarget: 85,
    lastWorkout: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    missedWorkouts: 0,
    recentPRs: 1,
    consistencyScore: 88
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 relative pt-[44px]">
      <div className="relative">
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
              <FrequencySection />
              <RestSection />
              <EnergySection 
                energyData={dashboardData ? {
                  date: new Date().toISOString().split('T')[0],
                  calories: dashboardData.totalCalories,
                  protein_g: dashboardData.totalMacros.protein,
                  carb_g: dashboardData.totalMacros.carbs,
                  fat_g: dashboardData.totalMacros.fat,
                  salt_g: 2.3, // Mock for now
                  water_l: 3.2, // Mock for now
                  first_meal_time: '08:30', // Mock for now
                  last_meal_time: '20:15', // Mock for now
                  tdee: dashboardData.userMetrics?.tdee || 2200,
                  bmr: dashboardData.userMetrics?.bmr || 1800
                } : undefined}
              />
              <EffortSection />
            </div>
            
            {/* Essential Actions - Restored CTAs */}
            <div className="mt-6 bg-gray-900/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-800">
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => navigate('/chat')}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium transition-all duration-200 min-h-[44px] flex-1 max-w-[200px] justify-center"
                >
                  <MessageSquare size={20} />
                  <span className="text-sm">Chat with Pat</span>
                </button>
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