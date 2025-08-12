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
    <div className="bg-pat-gradient rounded-2xl p-6 mb-8 shadow-pat-glow">
      <div className="flex items-center gap-3 mb-4">
        <Calendar size={20} className="text-white" />
        <h2 className="text-xl font-bold text-white">Today's Summary</h2>
      </div>
      
      <div className="bg-black/20 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-white/90 text-sm leading-relaxed mb-3">
          <span className="font-semibold">{today}</span> - 
          {totalCalories > 0 ? (
            <>
              You've logged {totalCalories} calories today
              {calorieProgress >= 90 ? " and you're on track with your nutrition goals!" : 
               calorieProgress >= 50 ? " - keep it up!" : 
               " - don't forget to log your meals!"}
            </>
          ) : (
            "Ready to start tracking your nutrition today!"
          )}
        </p>
        
        <div className="flex items-center gap-2 text-green-300 text-sm">
          <CheckCircle size={16} />
          <span>{goalsCompleted}/{totalGoals} daily goals completed</span>
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-white/80 text-sm italic">
          {totalCalories > 0 ? 
            "\"Great job logging your nutrition! Every entry helps me help you better.\" - Pat" :
            "\"Ready to start your day? Let's log some nutrition data!\" - Pat"
          }
        </p>
      </div>
    </div>
  );
};