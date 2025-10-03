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

type UnitType = 'g' | 'oz' | 'cup';

const unitConversions: Record<UnitType, number> = {
  'g': 1,
  'oz': 28.35,
  'cup': 240,
};

export const PortionControls: React.FC<PortionControlsProps> = ({
  baseServingGrams,
  baseServingMacros,
  initialGrams,
  onPortionChange
}) => {
  const [currentGrams, setCurrentGrams] = useState(initialGrams || baseServingGrams);
  const [customValue, setCustomValue] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<UnitType>('g');

  // Ensure all macro values are numbers and default to 0 if invalid
  const safeMacros = {
    kcal: Number(baseServingMacros.kcal) || 0,
    protein_g: Number(baseServingMacros.protein_g) || 0,
    carbs_g: Number(baseServingMacros.carbs_g) || 0,
    fat_g: Number(baseServingMacros.fat_g) || 0,
  };

  const safeBaseGrams = Number(baseServingGrams) || 100;

  const calculateMacros = (grams: number) => {
    const safeGrams = Number(grams) || 0;
    const ratio = safeGrams / safeBaseGrams;
    
    return {
      kcal: Math.round((safeMacros.kcal * ratio) * 10) / 10,
      protein_g: Math.round((safeMacros.protein_g * ratio) * 10) / 10,
      carbs_g: Math.round((safeMacros.carbs_g * ratio) * 10) / 10,
      fat_g: Math.round((safeMacros.fat_g * ratio) * 10) / 10,
    };
  };

  const updatePortion = (grams: number) => {
    const safeGrams = Number(grams) || 0;
    setCurrentGrams(safeGrams);
    const macros = calculateMacros(safeGrams);
    onPortionChange({ grams: safeGrams, macros });
  };

  const handlePresetClick = (multiplier: number) => {
    const newGrams = Math.round(safeBaseGrams * multiplier);
    updatePortion(newGrams);
    setCustomValue('');
  };

  const handleCustomValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomValue(value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      const gramsFromUnit = numValue * unitConversions[selectedUnit];
      setCurrentGrams(gramsFromUnit);
      const macros = calculateMacros(gramsFromUnit);
      onPortionChange({ grams: gramsFromUnit, macros });
    }
  };

  const handleUnitChange = (unit: UnitType) => {
    setSelectedUnit(unit);
    setCustomValue('');
  };

  // Initialize on mount
  useEffect(() => {
    const initialValue = Number(initialGrams) || safeBaseGrams;
    const macros = calculateMacros(initialValue);
    onPortionChange({ grams: initialValue, macros });
  }, []);

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-gray-700">Portion size:</div>

      {/* Preset Buttons */}
      <div className="flex gap-2 flex-wrap">
        {presets.map((preset) => {
          const presetGrams = Math.round(safeBaseGrams * preset.multiplier);
          const isSelected = Math.abs(currentGrams - presetGrams) < 1 && !customValue;

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

      {/* Custom Amount with Unit Selector */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-700">Custom:</div>

        {/* Unit Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(['g', 'oz', 'cup'] as UnitType[]).map((unit) => (
            <button
              key={unit}
              onClick={() => handleUnitChange(unit)}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedUnit === unit
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {unit === 'g' ? 'Grams' : unit === 'oz' ? 'Ounces' : 'Cups'}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={customValue}
            onChange={handleCustomValueChange}
            placeholder={`Enter ${selectedUnit}`}
            min="0.1"
            max="10000"
            step={selectedUnit === 'g' ? '1' : '0.1'}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500 font-medium w-12">
            {selectedUnit}
          </span>
        </div>
      </div>
    </div>
  );
};