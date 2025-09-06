import React, { useState, useEffect } from 'react';
import { NavigationSidebar } from './NavigationSidebar';
import { PatAvatar } from './PatAvatar';
import { MessageSquare, Mic } from 'lucide-react';
import { FrequencySection } from './dashboard/FrequencySection';
import { RestSection } from './dashboard/RestSection';
import { EnergySection } from './dashboard/EnergySection';
import { EffortSection } from './dashboard/EffortSection';
import { DailySummary } from './dashboard/DailySummary';
import { AlertCenter } from './dashboard/AlertCenter';
import { MetricAlert, CrossMetricInsight } from '../types/metrics';
import { PatMoodCalculator, UserMetrics } from '../utils/patMoodCalculator';
import { QuickActions } from './profile/QuickActions';
import { getSupabase } from '../lib/supabase';
import type { FoodEntry } from '../types/food';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

interface UserMetricsData {
  tdee?: number;
  protein_g?: number;
  bmr?: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [showNavigation, setShowNavigation] = useState(false);
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
      <div className="h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex flex-col">
      <NavigationSidebar 
        isOpen={showNavigation} 
        onClose={() => setShowNavigation(false)} 
        onNavigate={onNavigate}
        onNewChat={() => onNavigate('chat')}
        userProfile={null}
      />
      
      {/* Fixed Header - 60px height */}
      <div className="h-[60px] flex-shrink-0">
        <div className="flex items-center justify-between h-full px-4 bg-white border-b border-gray-100">
          <div className="flex items-center">
            {/* Empty space for symmetry */}
          </div>
          
          <h1 className="text-xs font-semibold text-gray-900 tracking-wide">
            PAT
          </h1>
          
          <div className="flex items-center gap-2">
            <AlertCenter 
              alerts={alerts} 
              onDismissAlert={handleDismissAlert}
            />
            <button
              onClick={() => setShowNavigation(true)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main Content Area - Dynamic height with scrolling */}
      <div className="flex-1 overflow-hidden relative">
        {/* Animated Pat Avatar in corner */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={() => onNavigate('chat')}
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
        
        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <div className="py-4 pb-20">
            {/* Daily Summary */}
            <DailySummary 
              totalCalories={dashboardData?.totalCalories || 0}
              targetCalories={dashboardData?.userMetrics?.tdee || 2200}
              proteinTarget={dashboardData?.userMetrics?.protein_g || 150}
              currentProtein={dashboardData?.totalMacros?.protein || 0}
            />
            
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
            
            {/* Essential Actions - Moved from Profile */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <Plus size={20} className="text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Essential Actions</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => onNavigate('workout')}
                  className="p-4 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-lg text-left transition-colors"
                >
                  <div className="text-orange-300 font-medium text-sm">Start Workout</div>
                  <div className="text-orange-200 text-xs">Begin your training session</div>
                </button>
                <button 
                  onClick={() => onNavigate('nutrition')}
                  className="p-4 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-left transition-colors"
                >
                  <div className="text-green-300 font-medium text-sm">Log Meal</div>
                  <div className="text-green-200 text-xs">Track your nutrition</div>
                </button>
                <button 
                  onClick={() => onNavigate('chat')}
                  className="p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-left transition-colors"
                >
                  <div className="text-blue-300 font-medium text-sm">Chat with Pat</div>
                  <div className="text-blue-200 text-xs">Get personalized advice</div>
                </button>
                <button 
                  onClick={() => onNavigate('progress')}
                  className="p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-left transition-colors"
                >
                  <div className="text-purple-300 font-medium text-sm">View Progress</div>
                  <div className="text-purple-200 text-xs">Check your stats</div>
                </button>
              </div>
            </div>
            
            {/* Quick Actions - Moved from Profile */}
            <QuickActions onNavigate={onNavigate} />
            
            </div>
            
          </div>
        </div>
      </div>
      
      {/* Fixed Footer - 40px height */}
      <div className="h-[40px] flex-shrink-0 bg-gray-900 border-t border-gray-800 flex items-center justify-center">
        <p className="text-xs text-gray-500">© 2024 Pat AI Assistant</p>
      </div>
    </div>
  );
};