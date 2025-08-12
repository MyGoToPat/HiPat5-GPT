import React, { useState } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { Scale } from 'lucide-react';

export const StepWeight: React.FC = () => {
  const { userData, updateUserData, setStepValidity, currentStep } = useOnboarding();
  
  // Get gender-based default weights
  const getDefaultWeight = (gender: string | undefined, unit: 'lbs' | 'kg') => {
    if (!gender) return { lbs: '', kg: '' };
    
    const defaults = {
      male: { lbs: '200', kg: '90.7' },
      female: { lbs: '150', kg: '68.0' }
    };
    
    return defaults[gender as keyof typeof defaults] || defaults.male;
  };
  
  // Initialize weight value based on existing data or gender-based defaults
  const initializeWeightValue = () => {
    if (userData.weight?.value) {
      // Convert existing kg value to current unit display
      return unit === 'lbs' 
        ? (userData.weight.value / 0.453592).toFixed(1)
        : userData.weight.value.toFixed(1);
    } else if (userData.gender) {
      // Use gender-based defaults
      const defaults = getDefaultWeight(userData.gender, unit);
      return unit === 'lbs' ? defaults.lbs : defaults.kg;
    }
    return '';
  };
  
  const [unit, setUnit] = useState<'lbs' | 'kg'>('lbs');
  const [weightValue, setWeightValue] = useState<string>(initializeWeightValue());

  // Update weight value when unit changes or gender is set
  React.useEffect(() => {
    const newValue = initializeWeightValue();
    setWeightValue(newValue);
    
    // Auto-update user data with default if gender is set but no weight exists
    if (userData.gender && !userData.weight && newValue) {
      const weightNum = parseFloat(newValue);
      if (!isNaN(weightNum) && validateWeight(weightNum, unit)) {
        updateUserData('weight', { value: weightNum, unit });
        setStepValidity(currentStep, true);
      }
    }
  }, [unit, userData.gender]);

  const validateWeight = (value: number, currentUnit: 'lbs' | 'kg'): boolean => {
    if (currentUnit === 'lbs') {
      return value >= 60 && value <= 500;
    } else { // kg
      return value >= 30 && value <= 230;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWeightValue(value);
    const weightNum = parseFloat(value);
    const isValid = !isNaN(weightNum) && validateWeight(weightNum, unit);
    updateUserData('weight', isValid ? { value: weightNum, unit } : undefined);
    setStepValidity(currentStep, isValid);
  };

  const handleUnitChange = (newUnit: 'lbs' | 'kg') => {
    const currentWeight = parseFloat(weightValue);
    
    // Convert existing value to new unit
    if (!isNaN(currentWeight)) {
      let convertedValue: string;
      if (newUnit === 'kg' && unit === 'lbs') {
        convertedValue = (currentWeight * 0.453592).toFixed(1);
      } else if (newUnit === 'lbs' && unit === 'kg') {
        convertedValue = (currentWeight / 0.453592).toFixed(1);
      } else {
        convertedValue = weightValue;
      }
      setWeightValue(convertedValue);
    } else if (userData.gender) {
      // No current value, use gender-based default for new unit
      const defaults = getDefaultWeight(userData.gender, newUnit);
      setWeightValue(newUnit === 'lbs' ? defaults.lbs : defaults.kg);
    }
    
    setUnit(newUnit);
    const weightNum = parseFloat(weightValue || '0');
    const isValid = !isNaN(weightNum) && validateWeight(weightNum, newUnit);
    updateUserData('weight', isValid ? { value: weightNum, unit: newUnit } : undefined);
    setStepValidity(currentStep, isValid);
  };

  React.useEffect(() => {
    // Set initial validity based on existing data
    const initialWeight = userData.weight?.value;
    if (initialWeight !== undefined) {
      // Convert stored kg back to current unit for validation
      const valueInCurrentUnit = unit === 'lbs' ? initialWeight / 0.453592 : initialWeight;
      setStepValidity(currentStep, validateWeight(valueInCurrentUnit, unit));
    } else {
      setStepValidity(currentStep, false);
    }
  }, [setStepValidity, currentStep, userData.weight, unit]);

  const isValid = weightValue && !isNaN(parseFloat(weightValue)) && validateWeight(parseFloat(weightValue), unit);

  return (
    <div className="text-center">
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <input
            type="number"
            value={weightValue}
            onChange={handleChange}
            placeholder={userData.gender ? getDefaultWeight(userData.gender, unit)[unit] : `Weight in ${unit}`}
            min={unit === 'lbs' ? 60 : 30}
            max={unit === 'lbs' ? 500 : 230}
            step={unit === 'lbs' ? "1" : "0.5"}
            className="flex-1 px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pat-blue-500 focus:border-transparent text-center text-xl font-semibold"
          />
          <select
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value as 'lbs' | 'kg')}
            className="px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pat-blue-500 font-medium"
          >
            <option value="lbs">lbs</option>
            <option value="kg">kg</option>
          </select>
        </div>

        {/* Unit toggle buttons */}
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => handleUnitChange('lbs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              unit === 'lbs' 
                ? 'bg-pat-purple-600 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Pounds
          </button>
          <button
            type="button"
            onClick={() => handleUnitChange('kg')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              unit === 'kg' 
                ? 'bg-pat-purple-600 text-white' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Kilograms
          </button>
        </div>
      </div>
      
      {weightValue && !isValid && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">
            Please enter a valid weight ({unit === 'lbs' ? '60-500 lbs' : '30-230 kg'}).
          </p>
        </div>
      )}
    </div>
  );
};