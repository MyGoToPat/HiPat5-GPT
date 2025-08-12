import React, { useState, useEffect } from 'react';
import { Check, X, Edit3, Calculator } from 'lucide-react';
import { FoodEntry } from '../types/food';

interface MacroData {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface FoodVerificationScreenProps {
  initialFoodName: string;
  initialMacros: MacroData;
  initialGrams?: number;
  patMessage?: string;
  onConfirm: (entry: Omit<FoodEntry, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const FoodVerificationScreen: React.FC<FoodVerificationScreenProps> = ({
  initialFoodName,
  initialMacros,
  initialGrams = 100,
  patMessage,
  onConfirm,
  onCancel
}) => {
  const [foodName, setFoodName] = useState(initialFoodName);
  const [grams, setGrams] = useState(initialGrams);
  const [baseMacros] = useState(initialMacros); // Keep original 100g values
  const [currentMacros, setCurrentMacros] = useState(initialMacros);

  // Recalculate macros when grams change
  useEffect(() => {
    const multiplier = grams / 100;
    setCurrentMacros({
      kcal: Math.round(baseMacros.kcal * multiplier),
      protein_g: parseFloat((baseMacros.protein_g * multiplier).toFixed(1)),
      carbs_g: parseFloat((baseMacros.carbs_g * multiplier).toFixed(1)),
      fat_g: parseFloat((baseMacros.fat_g * multiplier).toFixed(1))
    });
  }, [grams, baseMacros]);

  const handleMacroChange = (field: keyof MacroData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setCurrentMacros(prev => ({
      ...prev,
      [field]: field === 'kcal' ? Math.round(numValue) : parseFloat(numValue.toFixed(1))
    }));
  };

  const handleConfirm = () => {
    if (!foodName.trim()) {
      return;
    }

    const entry: Omit<FoodEntry, 'id' | 'createdAt'> = {
      foodName: foodName.trim(),
      grams: grams,
      sourceDb: 'OpenAI LLM',
      macros: currentMacros,
      confidence: 0.85 // Default confidence for LLM results
    };

    onConfirm(entry);
  };

  const defaultPatMessage = `I found nutrition information for "${initialFoodName}." Please review and edit if needed before saving.`;

  return (
    <div className="space-y-6">
      {/* Pat's Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">P</span>
          </div>
          <p className="text-blue-800 text-sm leading-relaxed">
            {patMessage || defaultPatMessage}
          </p>
        </div>
      </div>

      {/* Food Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Food Name
        </label>
        <div className="relative">
          <Edit3 size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            placeholder="Enter food name"
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Portion Size */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Portion Size (grams)
        </label>
        <div className="relative">
          <Calculator size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            value={grams}
            onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
            min="1"
            max="2000"
            step="1"
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-gray-400 text-xs mt-1">
          Macros will automatically adjust based on portion size
        </p>
      </div>

      {/* Macro Values */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Nutrition Information (for {grams}g)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Calories</label>
            <input
              type="number"
              value={currentMacros.kcal}
              onChange={(e) => handleMacroChange('kcal', e.target.value)}
              min="0"
              max="9999"
              step="1"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Protein (g)</label>
            <input
              type="number"
              value={currentMacros.protein_g}
              onChange={(e) => handleMacroChange('protein_g', e.target.value)}
              min="0"
              max="999"
              step="0.1"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Carbs (g)</label>
            <input
              type="number"
              value={currentMacros.carbs_g}
              onChange={(e) => handleMacroChange('carbs_g', e.target.value)}
              min="0"
              max="999"
              step="0.1"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Fat (g)</label>
            <input
              type="number"
              value={currentMacros.fat_g}
              onChange={(e) => handleMacroChange('fat_g', e.target.value)}
              min="0"
              max="999"
              step="0.1"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
        </div>
      </div>

      {/* Macro Summary */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Nutrition Summary</h4>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-white">{currentMacros.kcal}</div>
            <div className="text-gray-400 text-xs">Calories</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-400">{currentMacros.protein_g}g</div>
            <div className="text-gray-400 text-xs">Protein</div>
          </div>
          <div>
            <div className="text-xl font-bold text-blue-400">{currentMacros.carbs_g}g</div>
            <div className="text-gray-400 text-xs">Carbs</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">{currentMacros.fat_g}g</div>
            <div className="text-gray-400 text-xs">Fat</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          <X size={16} />
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!foodName.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          <Check size={16} />
          Confirm & Save
        </button>
      </div>
    </div>
  );
};