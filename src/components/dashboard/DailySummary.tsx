import React from 'react';
import { Calendar, CheckCircle } from 'lucide-react';

interface DailySummaryProps {
  totalCalories: number;
  targetCalories: number;
  proteinTarget: number;
  currentProtein: number;
  currentFiber?: number;  // NEW: Current fiber intake in grams
  fiberTarget?: number;   // NEW: Optional fiber goal
  tdee?: number;          // NEW: User's TDEE for deficit calculation
  weeklyStats?: {         // NEW: Weekly summary stats
    totalCalories: number;
    totalDeficit: number;
    projectedFatLoss: number;
  };
}

export const DailySummary: React.FC<DailySummaryProps> = ({
  totalCalories,
  targetCalories,
  proteinTarget,
  currentProtein,
  currentFiber = 0,
  fiberTarget,
  tdee = 0,
  weeklyStats
}) => {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const calorieProgress = targetCalories > 0 ? Math.round((totalCalories / targetCalories) * 100) : 0;
  const proteinProgress = proteinTarget > 0 ? Math.round((currentProtein / proteinTarget) * 100) : 0;
  const goalsCompleted = [calorieProgress >= 90, proteinProgress >= 80].filter(Boolean).length;
  const totalGoals = 2; // For now, just calories and protein
  
  // Calculate target deficit (TDEE - Daily Target)
  const targetDeficit = tdee > 0 && targetCalories > 0 ? tdee - targetCalories : 0;
  
  // Calculate actual deficit (TDEE - Consumed)
  const actualDeficit = tdee > 0 ? tdee - totalCalories : 0;

  return (
    <div className="bg-pat-gradient rounded-2xl p-4 sm:p-6 mb-6 shadow-pat-glow">
      <div className="flex items-center gap-3 mb-4">
        <Calendar size={20} className="text-white" />
        <h2 className="text-lg sm:text-xl font-bold text-white">Today's Summary</h2>
      </div>
      
      <div className="bg-black/20 rounded-xl p-3 sm:p-4 backdrop-blur-sm">
        <p className="text-white/90 text-sm sm:text-base leading-relaxed mb-3">
          <span className="font-semibold">{today}</span> -
          {totalCalories > 0 ? (
            <>
              {totalCalories} / {targetCalories} calories
              {calorieProgress >= 90 ? " - on track!" :
               calorieProgress >= 50 ? " - keep going!" :
               " - log more meals!"}
            </>
          ) : (
            "Ready to start tracking your nutrition today!"
          )}
        </p>

        {totalCalories > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white/10 rounded-lg p-2">
                <div className="text-xs text-white/70">Calories</div>
                <div className="text-white font-semibold">{totalCalories} / {targetCalories}</div>
                <div className="text-xs text-green-300">{targetCalories - totalCalories > 0 ? `${targetCalories - totalCalories} left` : 'Goal met!'}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <div className="text-xs text-white/70">Protein</div>
                <div className="text-white font-semibold">{Math.round(currentProtein)}g / {proteinTarget}g</div>
                <div className="text-xs text-green-300">{proteinTarget - currentProtein > 0 ? `${Math.round(proteinTarget - currentProtein)}g left` : 'Goal met!'}</div>
              </div>
            </div>
            
            {/* NEW: Target Deficit Display */}
            {targetDeficit > 0 && (
              <div className="bg-white/10 rounded-lg p-2 mb-3">
                <div className="text-xs text-white/70">Target Deficit (TDEE - Daily Target)</div>
                <div className="text-white font-semibold">{targetDeficit} cal/day</div>
                <div className="text-xs text-blue-300">Actual: {actualDeficit} cal today</div>
              </div>
            )}
            
            {/* NEW: Weekly Stats */}
            {weeklyStats && weeklyStats.totalCalories > 0 && (
              <div className="bg-white/10 rounded-lg p-2 mb-3">
                <div className="text-xs text-white/70 mb-1">This Week (Last 7 Days)</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-white/70">Total Consumed</div>
                    <div className="text-white font-semibold">{weeklyStats.totalCalories.toLocaleString()} cal</div>
                  </div>
                  <div>
                    <div className="text-white/70">Total Deficit</div>
                    <div className="text-white font-semibold">{weeklyStats.totalDeficit.toLocaleString()} cal</div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <div className="text-xs text-white/70">Projected Fat Loss</div>
                  <div className="text-green-300 font-bold text-base">{weeklyStats.projectedFatLoss} lb</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* NEW: Fiber display */}
        {totalCalories > 0 && currentFiber > 0 && (
          <div className="bg-white/10 rounded-lg p-2 mb-3">
            <div className="text-xs text-white/70">Fiber</div>
            <div className="text-white font-semibold">
              {Math.round(currentFiber * 10) / 10}g
              {fiberTarget && ` / ${fiberTarget}g`}
            </div>
            {fiberTarget && (
              <div className="text-xs text-green-300">
                {fiberTarget - currentFiber > 0 ? `${Math.round((fiberTarget - currentFiber) * 10) / 10}g left` : 'Goal met!'}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-green-300 text-xs sm:text-sm">
          <CheckCircle size={16} />
          <span>{goalsCompleted}/{totalGoals} daily goals completed</span>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-white/80 text-xs sm:text-sm italic">
          {totalCalories > 0 ? 
            "\"Great job logging your nutrition! Every entry helps me help you better.\" - Pat" :
            "\"Ready to start your day? Let's log some nutrition data!\" - Pat"
          }
        </p>
      </div>
    </div>
  );
};