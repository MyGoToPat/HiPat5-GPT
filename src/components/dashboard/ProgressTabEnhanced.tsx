import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, Target, Zap, Moon, Activity, ChevronLeft, ChevronRight, Filter, Download } from 'lucide-react';

interface MacroTrend {
  date: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  target: {
    protein: number;
    carbs: number;
    fat: number;
    calories: number;
  };
}

interface AdherenceData {
  week: string;
  workouts: { completed: number; planned: number; adherence: number };
  nutrition: { logged: number; target: number; adherence: number };
  sleep: { avgHours: number; target: number; adherence: number };
}

interface SleepPattern {
  date: string;
  bedtime: string;
  wakeTime: string;
  duration: number;
  quality: number;
  deepSleep: number;
  remSleep: number;
  lightSleep: number;
}

interface ProgressTabEnhancedProps {
  clientId: string;
  timeframe: '7d' | '30d' | '90d';
  onTimeframeChange: (timeframe: '7d' | '30d' | '90d') => void;
}

export const ProgressTabEnhanced: React.FC<ProgressTabEnhancedProps> = ({
  clientId,
  timeframe,
  onTimeframeChange
}) => {
  const [activeView, setActiveView] = useState<'overview' | 'macros' | 'adherence' | 'sleep'>('overview');
  const [selectedWeek, setSelectedWeek] = useState(0);

  // Mock macro trends data
  const macroTrends: MacroTrend[] = [
    {
      date: '2024-01-15',
      protein: 165,
      carbs: 180,
      fat: 85,
      calories: 2150,
      target: { protein: 180, carbs: 200, fat: 80, calories: 2200 }
    },
    {
      date: '2024-01-16',
      protein: 172,
      carbs: 195,
      fat: 78,
      calories: 2180,
      target: { protein: 180, carbs: 200, fat: 80, calories: 2200 }
    },
    {
      date: '2024-01-17',
      protein: 158,
      carbs: 175,
      fat: 92,
      calories: 2095,
      target: { protein: 180, carbs: 200, fat: 80, calories: 2200 }
    },
    {
      date: '2024-01-18',
      protein: 185,
      carbs: 205,
      fat: 75,
      calories: 2240,
      target: { protein: 180, carbs: 200, fat: 80, calories: 2200 }
    },
    {
      date: '2024-01-19',
      protein: 178,
      carbs: 188,
      fat: 82,
      calories: 2165,
      target: { protein: 180, carbs: 200, fat: 80, calories: 2200 }
    },
    {
      date: '2024-01-20',
      protein: 192,
      carbs: 210,
      fat: 88,
      calories: 2285,
      target: { protein: 180, carbs: 200, fat: 80, calories: 2200 }
    },
    {
      date: '2024-01-21',
      protein: 175,
      carbs: 192,
      fat: 79,
      calories: 2195,
      target: { protein: 180, carbs: 200, fat: 80, calories: 2200 }
    }
  ];

  // Mock adherence data
  const adherenceData: AdherenceData[] = [
    {
      week: 'Week 1',
      workouts: { completed: 4, planned: 5, adherence: 80 },
      nutrition: { logged: 18, target: 21, adherence: 86 },
      sleep: { avgHours: 7.2, target: 8, adherence: 90 }
    },
    {
      week: 'Week 2',
      workouts: { completed: 5, planned: 5, adherence: 100 },
      nutrition: { logged: 20, target: 21, adherence: 95 },
      sleep: { avgHours: 7.8, target: 8, adherence: 98 }
    },
    {
      week: 'Week 3',
      workouts: { completed: 3, planned: 5, adherence: 60 },
      nutrition: { logged: 15, target: 21, adherence: 71 },
      sleep: { avgHours: 6.5, target: 8, adherence: 81 }
    },
    {
      week: 'Week 4',
      workouts: { completed: 4, planned: 5, adherence: 80 },
      nutrition: { logged: 19, target: 21, adherence: 90 },
      sleep: { avgHours: 7.5, target: 8, adherence: 94 }
    }
  ];

  // Mock sleep patterns
  const sleepPatterns: SleepPattern[] = [
    {
      date: '2024-01-15',
      bedtime: '23:30',
      wakeTime: '07:00',
      duration: 7.5,
      quality: 85,
      deepSleep: 1.8,
      remSleep: 1.5,
      lightSleep: 4.2
    },
    {
      date: '2024-01-16',
      bedtime: '23:45',
      wakeTime: '07:15',
      duration: 7.5,
      quality: 78,
      deepSleep: 1.6,
      remSleep: 1.4,
      lightSleep: 4.5
    },
    {
      date: '2024-01-17',
      bedtime: '00:15',
      wakeTime: '07:30',
      duration: 7.25,
      quality: 72,
      deepSleep: 1.4,
      remSleep: 1.3,
      lightSleep: 4.55
    },
    {
      date: '2024-01-18',
      bedtime: '23:00',
      wakeTime: '06:45',
      duration: 7.75,
      quality: 92,
      deepSleep: 2.1,
      remSleep: 1.7,
      lightSleep: 3.95
    },
    {
      date: '2024-01-19',
      bedtime: '23:15',
      wakeTime: '07:00',
      duration: 7.75,
      quality: 88,
      deepSleep: 1.9,
      remSleep: 1.6,
      lightSleep: 4.25
    },
    {
      date: '2024-01-20',
      bedtime: '00:30',
      wakeTime: '08:00',
      duration: 7.5,
      quality: 65,
      deepSleep: 1.2,
      remSleep: 1.1,
      lightSleep: 5.2
    },
    {
      date: '2024-01-21',
      bedtime: '23:20',
      wakeTime: '06:50',
      duration: 7.5,
      quality: 89,
      deepSleep: 1.8,
      remSleep: 1.5,
      lightSleep: 4.2
    }
  ];

  const getAdherenceColor = (adherence: number) => {
    if (adherence >= 90) return 'text-green-600 bg-green-100';
    if (adherence >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getAdherenceIcon = (adherence: number) => {
    if (adherence >= 90) return <TrendingUp size={16} />;
    if (adherence >= 75) return <Activity size={16} />;
    return <TrendingDown size={16} />;
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <Target size={20} className="text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">GOALS</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">87%</p>
          <p className="text-sm text-blue-700">Completion Rate</p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <TrendingUp size={12} className="text-green-600" />
            <span className="text-green-600">+5% vs last period</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <Zap size={20} className="text-green-600" />
            <span className="text-xs text-green-700 font-medium">NUTRITION</span>
          </div>
          <p className="text-2xl font-bold text-green-900">92%</p>
          <p className="text-sm text-green-700">Macro Adherence</p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <TrendingUp size={12} className="text-green-600" />
            <span className="text-green-600">+8% vs last period</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Activity size={20} className="text-purple-600" />
            <span className="text-xs text-purple-700 font-medium">WORKOUTS</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">85%</p>
          <p className="text-sm text-purple-700">Completion Rate</p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <TrendingDown size={12} className="text-red-600" />
            <span className="text-red-600">-3% vs last period</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <Moon size={20} className="text-indigo-600" />
            <span className="text-xs text-indigo-700 font-medium">SLEEP</span>
          </div>
          <p className="text-2xl font-bold text-indigo-900">7.4h</p>
          <p className="text-sm text-indigo-700">Average Duration</p>
          <div className="flex items-center gap-1 mt-1 text-xs">
            <TrendingUp size={12} className="text-green-600" />
            <span className="text-green-600">+0.3h vs last period</span>
          </div>
        </div>
      </div>

      {/* Progress Trends Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Progress Trends</h4>
        <div className="h-64 flex items-end justify-between gap-2">
          {adherenceData.map((week, index) => (
            <div key={week.week} className="flex-1 flex flex-col items-center">
              <div className="w-full space-y-1 mb-2">
                {/* Workout bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-sm h-4">
                    <div 
                      className="bg-purple-500 h-4 rounded-sm transition-all duration-500"
                      style={{ width: `${week.workouts.adherence}%` }}
                    />
                  </div>
                </div>
                {/* Nutrition bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-sm h-4">
                    <div 
                      className="bg-green-500 h-4 rounded-sm transition-all duration-500"
                      style={{ width: `${week.nutrition.adherence}%` }}
                    />
                  </div>
                </div>
                {/* Sleep bar */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-sm h-4">
                    <div 
                      className="bg-indigo-500 h-4 rounded-sm transition-all duration-500"
                      style={{ width: `${week.sleep.adherence}%` }}
                    />
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-500">{week.week}</span>
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
            <span className="text-gray-600">Workouts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
            <span className="text-gray-600">Nutrition</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
            <span className="text-gray-600">Sleep</span>
          </div>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Weekly Breakdown</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
              disabled={selectedWeek === 0}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium px-3">
              {adherenceData[selectedWeek]?.week || 'Week 1'}
            </span>
            <button
              onClick={() => setSelectedWeek(Math.min(adherenceData.length - 1, selectedWeek + 1))}
              disabled={selectedWeek === adherenceData.length - 1}
              className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {adherenceData[selectedWeek] && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200" />
                  <circle
                    cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none"
                    strokeDasharray={`${adherenceData[selectedWeek].workouts.adherence * 1.76} 176`}
                    className="text-purple-500 transition-all duration-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900">
                    {adherenceData[selectedWeek].workouts.adherence}%
                  </span>
                </div>
              </div>
              <h5 className="font-medium text-gray-900">Workouts</h5>
              <p className="text-sm text-gray-600">
                {adherenceData[selectedWeek].workouts.completed}/{adherenceData[selectedWeek].workouts.planned} completed
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200" />
                  <circle
                    cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none"
                    strokeDasharray={`${adherenceData[selectedWeek].nutrition.adherence * 1.76} 176`}
                    className="text-green-500 transition-all duration-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900">
                    {adherenceData[selectedWeek].nutrition.adherence}%
                  </span>
                </div>
              </div>
              <h5 className="font-medium text-gray-900">Nutrition</h5>
              <p className="text-sm text-gray-600">
                {adherenceData[selectedWeek].nutrition.logged}/{adherenceData[selectedWeek].nutrition.target} meals logged
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-gray-200" />
                  <circle
                    cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none"
                    strokeDasharray={`${adherenceData[selectedWeek].sleep.adherence * 1.76} 176`}
                    className="text-indigo-500 transition-all duration-500"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-900">
                    {adherenceData[selectedWeek].sleep.adherence}%
                  </span>
                </div>
              </div>
              <h5 className="font-medium text-gray-900">Sleep</h5>
              <p className="text-sm text-gray-600">
                {adherenceData[selectedWeek].sleep.avgHours}h avg / {adherenceData[selectedWeek].sleep.target}h target
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMacroTrends = () => (
    <div className="space-y-6">
      {/* Macro Trends Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Macro Nutrient Trends</h4>
        
        {/* Chart Area */}
        <div key="macro-trends-chart" className="h-64 mb-4">
          <div className="flex items-end justify-between h-full gap-1">
            {macroTrends.map((day, index) => {
              const maxCalories = Math.max(...macroTrends.map(d => Math.max(d.calories, d.target.calories)));
              const actualHeight = (day.calories / maxCalories) * 100;
              const targetHeight = (day.target.calories / maxCalories) * 100;
              
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full flex justify-center gap-1 mb-2">
                    {/* Target line */}
                    <div 
                      className="w-1 bg-gray-300 rounded-t-sm"
                      style={{ height: `${targetHeight * 2}px` }}
                    />
                    {/* Actual bar */}
                    <div 
                      className="w-4 bg-blue-500 rounded-t-sm transition-all duration-500 hover:bg-blue-600"
                      style={{ height: `${actualHeight * 2}px` }}
                    />
                  </div>
                  
                  <span className="text-xs text-gray-500 transform -rotate-45 origin-left">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    <div>Calories: {day.calories} / {day.target.calories}</div>
                    <div>Protein: {day.protein}g / {day.target.protein}g</div>
                    <div>Carbs: {day.carbs}g / {day.target.carbs}g</div>
                    <div>Fat: {day.fat}g / {day.target.fat}g</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <span className="text-gray-600">Actual Intake</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-gray-300 rounded-sm"></div>
            <span className="text-gray-600">Target</span>
          </div>
        </div>
      </div>

      {/* Macro Breakdown Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Daily Macro Breakdown</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protein</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carbs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fat</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adherence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {macroTrends.map((day) => {
                const calorieAdherence = Math.round((day.calories / day.target.calories) * 100);
                const proteinAdherence = Math.round((day.protein / day.target.protein) * 100);
                const overallAdherence = Math.round(
                  ((day.calories / day.target.calories) + 
                   (day.protein / day.target.protein) + 
                   (day.carbs / day.target.carbs) + 
                   (day.fat / day.target.fat)) / 4 * 100
                );
                
                return (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{day.calories} / {day.target.calories}</div>
                      <div className={`text-xs ${calorieAdherence >= 90 ? 'text-green-600' : calorieAdherence >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {calorieAdherence}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{day.protein}g / {day.target.protein}g</div>
                      <div className={`text-xs ${proteinAdherence >= 90 ? 'text-green-600' : proteinAdherence >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {proteinAdherence}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{day.carbs}g / {day.target.carbs}g</div>
                      <div className={`text-xs ${Math.round((day.carbs / day.target.carbs) * 100) >= 90 ? 'text-green-600' : Math.round((day.carbs / day.target.carbs) * 100) >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {Math.round((day.carbs / day.target.carbs) * 100)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{day.fat}g / {day.target.fat}g</div>
                      <div className={`text-xs ${Math.round((day.fat / day.target.fat) * 100) >= 90 ? 'text-green-600' : Math.round((day.fat / day.target.fat) * 100) >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {Math.round((day.fat / day.target.fat) * 100)}%
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getAdherenceColor(overallAdherence)}`}>
                        {getAdherenceIcon(overallAdherence)}
                        {overallAdherence}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Macro Insights */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
        <h4 className="font-medium text-green-900 mb-4">Nutrition Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-green-800">Protein intake improved 12% this week</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target size={14} className="text-blue-600" />
              <span className="text-blue-800">Most consistent macro: Carbohydrates (92% avg)</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingDown size={14} className="text-yellow-600" />
              <span className="text-yellow-800">Fat intake 8% below target on average</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={14} className="text-purple-600" />
              <span className="text-purple-800">Best adherence day: Thursday (96%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdherenceVisualization = () => (
    <div className="space-y-6">
      {/* Adherence Heatmap */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Adherence Heatmap</h4>
        
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => ( // eslint-disable-next-line react/jsx-key
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Generate 4 weeks of adherence data */}
        <div key="adherence-heatmap-weeks" className="space-y-2">
          {Array.from({ length: 4 }).map((_, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, dayIndex) => {
                const adherence = Math.floor(Math.random() * 40) + 60; // 60-100%
                const getHeatmapColor = (value: number) => {
                  if (value >= 95) return 'bg-green-600';
                  if (value >= 85) return 'bg-green-400';
                  if (value >= 75) return 'bg-yellow-400';
                  if (value >= 65) return 'bg-orange-400';
                  return 'bg-red-400';
                };
                
                return (
                  <div // eslint-disable-next-line react/jsx-key
                    key={dayIndex}
                    className={`w-8 h-8 rounded ${getHeatmapColor(adherence)} flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:scale-110 transition-transform`}
                    title={`${adherence}% adherence`}
                  >
                    {adherence}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Less adherent</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-orange-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
          </div>
          <span>More adherent</span>
        </div>
      </div>

      {/* Detailed Adherence Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {adherenceData.map((week, index) => (
          <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
            <h5 className="font-medium text-gray-900 mb-4">{week.week}</h5>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Workouts</span>
                  <span className="text-sm font-medium">{week.workouts.adherence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${week.workouts.adherence}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {week.workouts.completed}/{week.workouts.planned} completed
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Nutrition</span>
                  <span className="text-sm font-medium">{week.nutrition.adherence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${week.nutrition.adherence}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {week.nutrition.logged}/{week.nutrition.target} meals logged
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Sleep</span>
                  <span className="text-sm font-medium">{week.sleep.adherence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${week.sleep.adherence}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {week.sleep.avgHours}h avg / {week.sleep.target}h target
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Adherence Trends */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Adherence Trends</h4>
        
        <div className="h-48 flex items-end justify-between gap-4">
          {adherenceData.map((week) => ( // eslint-disable-next-line react/jsx-key
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full space-y-1 mb-2">
                <div className="flex justify-center">
                  <div 
                    className="w-6 bg-purple-500 rounded-t-sm"
                    style={{ height: `${week.workouts.adherence * 1.5}px` }}
                  />
                </div>
                <div className="flex justify-center">
                  <div 
                    className="w-6 bg-green-500 rounded-t-sm"
                    style={{ height: `${week.nutrition.adherence * 1.5}px` }}
                  />
                </div>
                <div className="flex justify-center">
                  <div 
                    className="w-6 bg-indigo-500 rounded-t-sm"
                    style={{ height: `${week.sleep.adherence * 1.5}px` }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-500">{week.week}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSleepPatterns = () => (
    <div className="space-y-6">
      {/* Sleep Quality Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between mb-2">
            <Moon size={20} className="text-indigo-600" />
            <span className="text-xs text-indigo-700 font-medium">DURATION</span>
          </div>
          <p className="text-2xl font-bold text-indigo-900">7.4h</p>
          <p className="text-sm text-indigo-700">Average</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <Activity size={20} className="text-purple-600" />
            <span className="text-xs text-purple-700 font-medium">QUALITY</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">82%</p>
          <p className="text-sm text-purple-700">Average</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <Target size={20} className="text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">CONSISTENCY</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">±32m</p>
          <p className="text-sm text-blue-700">Variance</p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-lg border border-teal-200">
          <div className="flex items-center justify-between mb-2">
            <Zap size={20} className="text-teal-600" />
            <span className="text-xs text-teal-700 font-medium">DEEP SLEEP</span>
          </div>
          <p className="text-2xl font-bold text-teal-900">1.7h</p>
          <p className="text-sm text-teal-700">Average</p>
        </div>
      </div>

      {/* Sleep Pattern Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Sleep Patterns</h4>
        
        <div className="space-y-3">
          {sleepPatterns.map((night) => {
            const totalSleep = night.deepSleep + night.remSleep + night.lightSleep;
            const deepPercent = (night.deepSleep / totalSleep) * 100;
            const remPercent = (night.remSleep / totalSleep) * 100;
            const lightPercent = (night.lightSleep / totalSleep) * 100;
            
            return (
              <div key={index} className="group">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium text-gray-900">
                    {new Date(night.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>{formatTime(night.bedtime)} - {formatTime(night.wakeTime)}</span>
                    <span>{night.duration}h</span>
                    <span className={`px-2 py-1 rounded-full ${
                      night.quality >= 85 ? 'bg-green-100 text-green-800' :
                      night.quality >= 75 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {night.quality}%
                    </span>
                  </div>
                </div>
                
                <div className="flex h-6 rounded-full overflow-hidden bg-gray-200">
                  <div 
                    className="bg-blue-600 transition-all duration-300 group-hover:bg-blue-500"
                    style={{ width: `${deepPercent}%` }}
                    title={`Deep: ${night.deepSleep}h`}
                  />
                  <div 
                    className="bg-purple-500 transition-all duration-300 group-hover:bg-purple-400"
                    style={{ width: `${remPercent}%` }}
                    title={`REM: ${night.remSleep}h`}
                  />
                  <div 
                    className="bg-blue-300 transition-all duration-300 group-hover:bg-blue-200"
                    style={{ width: `${lightPercent}%` }}
                    title={`Light: ${night.lightSleep}h`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
            <span className="text-gray-600">Deep Sleep</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
            <span className="text-gray-600">REM Sleep</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-300 rounded-sm"></div>
            <span className="text-gray-600">Light Sleep</span>
          </div>
        </div>
      </div>

      {/* Sleep Insights */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-200">
        <h4 className="font-medium text-indigo-900 mb-4">Sleep Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-indigo-800">Sleep quality improved 8% this week</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Moon size={14} className="text-indigo-600" />
              <span className="text-indigo-800">Optimal bedtime: 11:15 PM</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Target size={14} className="text-purple-600" />
              <span className="text-purple-800">Most consistent: Weekdays (±15min)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Activity size={14} className="text-blue-600" />
              <span className="text-blue-800">Deep sleep: 23% (target: 20-25%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const views = [
    { id: 'overview', label: 'Overview', icon: Target },
    { id: 'macros', label: 'Macro Trends', icon: Zap },
    { id: 'adherence', label: 'Adherence', icon: Activity },
    { id: 'sleep', label: 'Sleep Patterns', icon: Moon }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Enhanced Progress Analysis</h3>
          <p className="text-gray-600 text-sm">Detailed insights into client progress and patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {views.map((view) => {
            const IconComponent = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id as any)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeView === view.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent size={16} />
                {view.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'macros' && renderMacroTrends()}
      {activeView === 'adherence' && renderAdherenceVisualization()}
      {activeView === 'sleep' && renderSleepPatterns()}

      {/* TODO Comment */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>TODO:</strong> Connect to backend APIs for real-time progress data, implement data export functionality, and add interactive chart library (Chart.js/Recharts)
        </p>
      </div>
    </div>
  );
};