import React from 'react';
import { Calendar, CheckCircle } from 'lucide-react';

interface DailySummaryProps {
  totalCalories: number;
  targetCalories: number;
  proteinTarget: number;
  currentProtein: number;
}

export const DailySummary: React.FC<DailySummaryProps> = ({
  totalCalories,
  targetCalories,
  proteinTarget,
  currentProtein
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