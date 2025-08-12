import React, { useState, useEffect } from 'react';
import { AppBar } from './AppBar';
import { NavigationSidebar } from './NavigationSidebar';
import { PatAvatar } from './PatAvatar';
import { FrequencySection } from './dashboard/FrequencySection';
import { RestSection } from './dashboard/RestSection';
import { EnergySection } from './dashboard/EnergySection';
import { EffortSection } from './dashboard/EffortSection';
import { ActivityLog } from './dashboard/ActivityLog';
import { DailySummary } from './dashboard/DailySummary';
import { AlertCenter } from './dashboard/AlertCenter';
import { CrossMetricInsights } from './dashboard/CrossMetricInsights';
import { MetricAlert, CrossMetricInsight } from '../types/metrics';
import { PatMoodCalculator, UserMetrics } from '../utils/patMoodCalculator';
import { supabase } from '../lib/supabase';
import { EnergyData } from '../types/metrics';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [showNavigation, setShowNavigation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    userMetrics: any;
    todaysFoodLogs: any[];
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
        const user = await supabase.auth.getUser();
        if (!user.data.user) return;

        // Get user metrics
        const { data: metrics } = await supabase
          .from('user_metrics')
          .select('*')
          .eq('user_id', user.data.user.id)
          .single();

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
            className="hover:scale-110 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-950 rounded-full group relative"
          >
            <PatAvatar size={48} mood={patMood} />
            
            
            {/* Mood tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 max-w-xs">
              {moodMessage}
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
            </div>
          </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <div className="px-4 py-6 pb-16">
            {/* Daily Summary */}
            <DailySummary 
              totalCalories={dashboardData?.totalCalories || 0}
              targetCalories={dashboardData?.userMetrics?.tdee || 2200}
              proteinTarget={dashboardData?.userMetrics?.protein_g || 150}
              currentProtein={dashboardData?.totalMacros?.protein || 0}
            />
            
            {/* FREE Dashboard Grid - Responsive Layout */}
            <div className="grid gap-6 mb-8" style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              '@media (min-width: 1200px)': {
                gridTemplateColumns: 'repeat(4, 1fr)'
              },
              '@media (min-width: 768px) and (max-width: 1199px)': {
                gridTemplateColumns: 'repeat(2, 1fr)'
              },
              '@media (max-width: 767px)': {
                gridTemplateColumns: '1fr'
              }
            }}>
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
            
            {/* Cross-Metric Insights */}
            <div className="mb-8">
              <CrossMetricInsights insights={insights} />
            </div>
            
            {/* Activity Log */}
            <ActivityLog 
              recentFoodLogs={dashboardData?.todaysFoodLogs || []}
            />
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