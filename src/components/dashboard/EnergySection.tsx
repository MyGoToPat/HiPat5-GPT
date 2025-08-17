import React from 'react';
import { Zap, Apple, TrendingDown } from 'lucide-react';
import { MacroWheel } from './MacroWheel';
import { EnergyData } from '../../types/metrics';
import { CollapsibleTile } from './CollapsibleTile';

interface EnergySectionProps {
  energyData?: EnergyData;
}

export const EnergySection: React.FC<EnergySectionProps> = ({ energyData }) => {
  // Use provided data or fallback to defaults
  const calories = energyData?.calories || 0;
  const tdee = energyData?.tdee || 2200;
  const deficit = tdee - calories;
  const protein = energyData?.protein_g || 0;
  const carbs = energyData?.carb_g || 0;
  const fat = energyData?.fat_g || 0;
  // Use provided data or create default structure
  const displayEnergyData: EnergyData = energyData || {
    date: '2024-01-21',
    calories: calories,
    protein_g: protein,
    fat_g: fat,
    carb_g: carbs,
    salt_g: 2.3,
    water_l: 3.2,
    first_meal_time: '08:30',
    last_meal_time: '20:15',
    tdee: tdee,
    bmr: 1850
  };

  const condensedContent = (
    <div className="text-center">
      {/* Calories vs TDEE */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-white mb-1">
          {calories > 0 ? calories.toLocaleString() : '0'}
        </div>
        <p className="text-sm text-gray-400">calories consumed</p>
        {calories > 0 && (
          <div className="flex items-center justify-center gap-1 text-xs text-green-400 mt-1">
            <TrendingDown size={12} />
            <span>{deficit > 0 ? `${deficit} deficit` : `${Math.abs(deficit)} surplus`}</span>
          </div>
        )}
      </div>
      
      {/* Quick macro summary */}
      {calories > 0 ? (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="text-white font-medium">{protein.toFixed(1)}g</div>
            <div className="text-red-400">Protein</div>
          </div>
          <div className="text-center">
            <div className="text-white font-medium">{carbs.toFixed(1)}g</div>
            <div className="text-blue-400">Carbs</div>
          </div>
          <div className="text-center">
            <div className="text-white font-medium">{fat.toFixed(1)}g</div>
            <div className="text-yellow-400">Fat</div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-gray-400 text-sm">No food logged today</p>
          <p className="text-gray-500 text-xs">Start logging to see your macros</p>
        </div>
      )}
    </div>
  );

  const fullContent = (
    <>
      {condensedContent}
      
      {/* Macro Wheel Component */}
      <div className="mt-4">
        <MacroWheel data={displayEnergyData} />
      </div>
      
      {/* Additional metrics */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Hydration</span>
          <span className="text-blue-400">{displayEnergyData.water_l}L</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Fasting window</span>
          <span className="text-purple-400">12h 15m</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Sodium</span>
          <span className="text-yellow-400">{displayEnergyData.salt_g}g</span>
        </div>
      </div>
    </>
  );

  return (
    <CollapsibleTile
      title="Energy"
      icon={Zap}
      iconColor="text-green-400"
      hoverColor="border-green-600"
      condensedContent={condensedContent}
      className=""
    >
      {fullContent}
    </CollapsibleTile>
  );
};