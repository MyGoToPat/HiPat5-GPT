import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { Ruler } from 'lucide-react';

export const StepHeight: React.FC = () => {
  const { userData, updateUserData, setStepValidity, currentStep } = useOnboarding();
  
  // State for input values
  const [unit, setUnit] = useState<'imperial' | 'metric'>('imperial');
  const [feet, setFeet] = useState<number>(5); // Default to 5 feet
  const [inches, setInches] = useState<number>(1); // Default to 1 inch
  const [centimeters, setCentimeters] = useState<number>(155); // Default equivalent

  // Initialize from existing data
  useEffect(() => {
    if (userData.height?.value) {
      const cm = userData.height.value;
      setCentimeters(Math.round(cm));
      
      // Convert to feet and inches
      const totalInches = cm / 2.54;
      const feetValue = Math.floor(totalInches / 12);
      const inchesValue = Math.round(totalInches % 12);
      
      setFeet(feetValue);
      setInches(inchesValue);
    } else {
      // Set default values and update user data immediately
      const defaultCm = convertToMetric(5, 1);
      setCentimeters(Math.round(defaultCm));
      updateUserData('height', { value: defaultCm, unit: 'cm' });
      setStepValidity(currentStep, true);
    }
  }, [userData.height]);

  const validateHeight = (cm: number): boolean => {
    return cm >= 90 && cm <= 250; // 3 feet to 8.2 feet
  };

  const convertToMetric = (feetVal: number, inchesVal: number): number => {
    const totalInches = (feetVal * 12) + inchesVal;
    return totalInches * 2.54;
  };

  const updateHeightData = (cm: number) => {
    const isValid = validateHeight(cm);
    updateUserData('height', isValid ? { value: cm, unit: 'cm' } : undefined);
    setStepValidity(currentStep, isValid);
  };

  const handleFeetChange = (value: number) => {
    setFeet(value);
    const cm = convertToMetric(value, inches);
    setCentimeters(Math.round(cm));
    updateHeightData(cm);
  };
    
  const handleInchesChange = (value: number) => {
    setInches(value);
    const cm = convertToMetric(feet, value);
    setCentimeters(Math.round(cm));
    updateHeightData(cm);
  };

  const handleCentimetersChange = (value: number) => {
    setCentimeters(value);
    const cm = value;
    
    if (cm > 0) {
      // Convert to feet and inches
      const totalInches = cm / 2.54;
      const feetValue = Math.floor(totalInches / 12);
      const inchesValue = Math.round(totalInches % 12);
      
      setFeet(feetValue);
      setInches(inchesValue);
      updateHeightData(cm);
    }
  };

  const handleUnitChange = (newUnit: 'imperial' | 'metric') => {
    setUnit(newUnit);
  };

  const getCurrentHeight = (): number => {
    if (unit === 'metric') {
      return centimeters;
    } else {
      return convertToMetric(feet, inches);
    }
  };

  const isValid = validateHeight(getCurrentHeight());

  // Set initial validity
  React.useEffect(() => {
    setStepValidity(currentStep, isValid);
  }, [setStepValidity, currentStep, isValid]);

  return (
    <div className="text-center">
      <div className="space-y-4">
        {/* Unit Toggle */}
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={() => handleUnitChange('imperial')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              unit === 'imperial' 
                ? 'bg-pat-blue-600 text-white shadow-lg' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Feet & Inches
          </button>
          <button
            type="button"
            onClick={() => handleUnitChange('metric')}
            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${
              unit === 'metric' 
                ? 'bg-pat-blue-600 text-white shadow-lg' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Centimeters
          </button>
        </div>

        {/* Input Fields */}
        <div className="transition-all duration-300 mb-4">
          {unit === 'imperial' ? (
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 max-w-[120px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Feet</label>
                <select
                  value={feet}
                  onChange={(e) => handleFeetChange(parseInt(e.target.value))}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pat-blue-500 focus:border-transparent text-center text-xl font-semibold transition-all"
                > // eslint-disable-next-line react/jsx-key
                  {Array.from({ length: 6 }, (_, i) => i + 3).map(foot => (
                    <option key={foot} value={foot}>{foot}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1 max-w-[120px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Inches</label>
                <select
                  value={inches}
                  onChange={(e) => handleInchesChange(parseInt(e.target.value))}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pat-blue-500 focus:border-transparent text-center text-xl font-semibold transition-all"
                > // eslint-disable-next-line react/jsx-key
                  {Array.from({ length: 11 }, (_, i) => i + 1).map(inch => (
                    <option key={inch} value={inch}>{inch}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="max-w-[200px] mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">Centimeters</label>
              <select
                value={centimeters}
                onChange={(e) => handleCentimetersChange(parseInt(e.target.value))}
                className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pat-blue-500 focus:border-transparent text-center text-xl font-semibold transition-all"
              > // eslint-disable-next-line react/jsx-key
                {Array.from({ length: 161 }, (_, i) => i + 90).map(cm => (
                  <option key={cm} value={cm}>{cm}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Conversion Display */}
      </div>
    </div>
  );
};