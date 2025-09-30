import React, { useState, useEffect } from 'react';

interface PortionControlsProps {
  baseServingGrams: number;
  baseServingMacros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  initialGrams?: number;
  onPortionChange: (next: {
    grams: number;
    macros: {
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    };
  }) => void;
}

const presets = [
  { label: '½ serving', multiplier: 0.5 },
  { label: '1 serving', multiplier: 1.0 },
  { label: '1½ servings', multiplier: 1.5 },
  { label: '2 servings', multiplier: 2.0 },
];

export const PortionControls: React.FC<PortionControlsProps> = ({
  baseServingGrams,
  baseServingMacros,
  initialGrams,
  onPortionChange
}) => {
  const [currentGrams, setCurrentGrams] = useState(initialGrams || baseServingGrams);
  const [customGrams, setCustomGrams] = useState(currentGrams.toString());

  const calculateMacros = (grams: number) => {
    const ratio = grams / baseServingGrams;
    return {
      kcal: Math.round(baseServingMacros.kcal * ratio),
      protein_g: Math.round(baseServingMacros.protein_g * ratio * 10) / 10,
      carbs_g: Math.round(baseServingMacros.carbs_g * ratio * 10) / 10,
      fat_g: Math.round(baseServingMacros.fat_g * ratio * 10) / 10,
    };
  };

  const updatePortion = (grams: number) => {
    setCurrentGrams(grams);
    setCustomGrams(grams.toString());
    const macros = calculateMacros(grams);
    onPortionChange({ grams, macros });
  };

  const handlePresetClick = (multiplier: number) => {
    const newGrams = Math.round(baseServingGrams * multiplier);
    updatePortion(newGrams);
  };

  const handleCustomGramsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomGrams(value);
    
    const grams = parseFloat(value);
    if (!isNaN(grams) && grams > 0) {
      setCurrentGrams(grams);
      const macros = calculateMacros(grams);
      onPortionChange({ grams, macros });
    }
  };

  // Initialize on mount
  useEffect(() => {
    const macros = calculateMacros(currentGrams);
    onPortionChange({ grams: currentGrams, macros });
  }, []);

  return (
    <div className="space-y-3">
      {/* Preset Buttons */}
      <div className="flex gap-2 flex-wrap">
        {presets.map((preset) => {
          const presetGrams = Math.round(baseServingGrams * preset.multiplier);
          const isSelected = Math.abs(currentGrams - presetGrams) < 1;
          
          return (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset.multiplier)}
              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom Grams Input */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
          Custom:
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={customGrams}
            onChange={handleCustomGramsChange}
            min="1"
            max="2000"
            step="1"
            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">g</span>
        </div>
      </div>
    </div>
  );
};