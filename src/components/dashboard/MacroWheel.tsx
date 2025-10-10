import React from 'react';
import { EnergyData } from '../../types/metrics';

interface MacroWheelProps {
  data: EnergyData;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  targetFiber?: number;
  targetCalories?: number;
  className?: string;
}

export const MacroWheel: React.FC<MacroWheelProps> = ({
  data,
  targetProtein,
  targetCarbs,
  targetFat,
  targetFiber,
  targetCalories,
  className = ''
}) => {
  // Consumed macros (from food logs)
  const proteinConsumed = data.protein_g;
  const carbsConsumed = data.carb_g;
  const fatConsumed = data.fat_g;
  const fiberConsumed = data.fiber_g || 0;
  const caloriesConsumed = data.calories;

  // Target macros (from TDEE onboarding)
  const proteinTarget = targetProtein || data.protein_g;
  const carbsTarget = targetCarbs || data.carb_g;
  const fatTarget = targetFat || data.fat_g;
  const fiberTarget = targetFiber || 25; // Default USDA recommendation
  const caloriesTarget = targetCalories || data.tdee;

  // Remaining macros
  const proteinRemaining = Math.max(0, proteinTarget - proteinConsumed);
  const carbsRemaining = Math.max(0, carbsTarget - carbsConsumed);
  const fatRemaining = Math.max(0, fatTarget - fatConsumed);
  const fiberRemaining = Math.max(0, fiberTarget - fiberConsumed);

  // Calculate percentages for the wheel (consumed / target)
  const proteinPercent = Math.min(100, (proteinConsumed / proteinTarget) * 100);
  const carbPercent = Math.min(100, (carbsConsumed / carbsTarget) * 100);
  const fatPercent = Math.min(100, (fatConsumed / fatTarget) * 100);

  const proteinCals = proteinConsumed * 4;
  const carbCals = carbsConsumed * 4;
  const fatCals = fatConsumed * 9;
  const totalMacroCals = proteinCals + carbCals + fatCals;
  
  const deficit = caloriesTarget - caloriesConsumed;
  const deficitPercent = Math.abs(deficit / caloriesTarget) * 100;
  
  // Calculate stroke dash arrays for the circular progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const proteinDash = (proteinPercent / 100) * circumference;
  const carbDash = (carbPercent / 100) * circumference;
  const fatDash = (fatPercent / 100) * circumference;
  
  return (
    <div className={`${className}`}>
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-700"
          />
          
          {/* Protein arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${proteinDash} ${circumference}`}
            className="text-red-500 transition-all duration-500"
            strokeLinecap="round"
          />
          
          {/* Carbs arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${carbDash} ${circumference}`}
            strokeDashoffset={`-${proteinDash}`}
            className="text-blue-500 transition-all duration-500"
            strokeLinecap="round"
          />
          
          {/* Fat arc */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${fatDash} ${circumference}`}
            strokeDashoffset={`-${proteinDash + carbDash}`}
            className="text-yellow-500 transition-all duration-500"
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-bold text-white">
            {data.calories.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">calories</div>
          <div className={`text-xs font-medium ${deficit > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {deficit > 0 ? '-' : '+'}{Math.abs(deficit)}
          </div>
        </div>
      </div>
      
      {/* Macro breakdown - Consumed / Target */}
      <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
        <div className="text-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-1"></div>
          <div className="text-white font-medium">{proteinConsumed.toFixed(0)} / {proteinTarget.toFixed(0)}g</div>
          <div className="text-gray-400">Protein</div>
          <div className={proteinRemaining > 0 ? 'text-yellow-400' : 'text-green-400'}>
            {proteinRemaining > 0 ? `${proteinRemaining.toFixed(0)}g left` : 'Goal met!'}
          </div>
        </div>
        <div className="text-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
          <div className="text-white font-medium">{carbsConsumed.toFixed(0)} / {carbsTarget.toFixed(0)}g</div>
          <div className="text-gray-400">Carbs</div>
          <div className={carbsRemaining > 0 ? 'text-yellow-400' : 'text-green-400'}>
            {carbsRemaining > 0 ? `${carbsRemaining.toFixed(0)}g left` : 'Goal met!'}
          </div>
        </div>
        <div className="text-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-1"></div>
          <div className="text-white font-medium">{fatConsumed.toFixed(0)} / {fatTarget.toFixed(0)}g</div>
          <div className="text-gray-400">Fat</div>
          <div className={fatRemaining > 0 ? 'text-yellow-400' : 'text-green-400'}>
            {fatRemaining > 0 ? `${fatRemaining.toFixed(0)}g left` : 'Goal met!'}
          </div>
        </div>
        <div className="text-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-1"></div>
          <div className="text-white font-medium">{fiberConsumed.toFixed(0)} / {fiberTarget.toFixed(0)}g</div>
          <div className="text-gray-400">Fiber</div>
          <div className={fiberRemaining > 0 ? 'text-yellow-400' : 'text-green-400'}>
            {fiberRemaining > 0 ? `${fiberRemaining.toFixed(0)}g left` : 'Goal met!'}
          </div>
        </div>
      </div>
      
      {/* TDEE comparison */}
      <div className="mt-3 p-2 bg-gray-800 rounded-lg">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Daily Target:</span>
          <span className="text-white">{caloriesTarget.toLocaleString()} cal</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Consumed:</span>
          <span className="text-white">{caloriesConsumed.toLocaleString()} cal</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Remaining:</span>
          <span className={deficit > 0 ? 'text-green-400' : 'text-red-400'}>
            {deficit > 0 ? `${Math.abs(deficit)} cal` : `${Math.abs(deficit)} over`}
          </span>
        </div>
      </div>
    </div>
  );
};