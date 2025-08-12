import React from 'react';
import { EnergyData } from '../../types/metrics';

interface MacroWheelProps {
  data: EnergyData;
  className?: string;
}

export const MacroWheel: React.FC<MacroWheelProps> = ({ data, className = '' }) => {
  const proteinCals = data.protein_g * 4;
  const carbCals = data.carb_g * 4;
  const fatCals = data.fat_g * 9;
  const totalMacroCals = proteinCals + carbCals + fatCals;
  
  const proteinPercent = (proteinCals / totalMacroCals) * 100;
  const carbPercent = (carbCals / totalMacroCals) * 100;
  const fatPercent = (fatCals / totalMacroCals) * 100;
  
  const deficit = data.tdee - data.calories;
  const deficitPercent = Math.abs(deficit / data.tdee) * 100;
  
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
      
      {/* Macro breakdown */}
      <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
        <div className="text-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-1"></div>
          <div className="text-white font-medium">{data.protein_g}g</div>
          <div className="text-gray-400">Protein</div>
          <div className="text-gray-500">{proteinPercent.toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-1"></div>
          <div className="text-white font-medium">{data.carb_g}g</div>
          <div className="text-gray-400">Carbs</div>
          <div className="text-gray-500">{carbPercent.toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-1"></div>
          <div className="text-white font-medium">{data.fat_g}g</div>
          <div className="text-gray-400">Fat</div>
          <div className="text-gray-500">{fatPercent.toFixed(0)}%</div>
        </div>
      </div>
      
      {/* TDEE comparison */}
      <div className="mt-3 p-2 bg-gray-800 rounded-lg">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">TDEE:</span>
          <span className="text-white">{data.tdee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Balance:</span>
          <span className={deficit > 0 ? 'text-green-400' : 'text-red-400'}>
            {deficit > 0 ? 'Deficit' : 'Surplus'} {Math.abs(deficit)}
          </span>
        </div>
      </div>
    </div>
  );
};