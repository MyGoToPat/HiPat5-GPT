import React, { useState } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { User, HelpCircle } from 'lucide-react';

export const StepBodyFat: React.FC = () => {
  const { userData, updateUserData, setStepValidity, currentStep } = useOnboarding();
  const [inputMethod, setInputMethod] = useState<'manual' | 'visual'>('manual');
  const [bodyFatInput, setBodyFatInput] = useState<string>(userData.bodyFatPercent?.toString() || '');
  const [showVisualEstimator, setShowVisualEstimator] = useState(false);

  const validateBodyFat = (bf: number): boolean => {
    return bf >= 3 && bf <= 38;
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBodyFatInput(value);
    const bfNum = parseFloat(value);
    const isValid = !isNaN(bfNum) && validateBodyFat(bfNum);
    
    if (isValid) {
      updateUserData('bodyFatPercent', bfNum);
    }
    setStepValidity(currentStep, isValid || value === '');
  };

  const handleVisualSelection = (bodyFat: number) => {
    setBodyFatInput(bodyFat.toString());
    updateUserData('bodyFatPercent', bodyFat);
    setStepValidity(currentStep, true);
    setShowVisualEstimator(false);
    setInputMethod('manual');
  };

  React.useEffect(() => {
    // Set initial validity based on existing data or if skipped
    const isValid = userData.bodyFatPercent ? validateBodyFat(userData.bodyFatPercent) : true;
    setStepValidity(currentStep, isValid);
  }, [setStepValidity, currentStep, userData.bodyFatPercent]);

  // Visual body fat estimator data - simplified with text descriptions only
  const bodyFatRanges = [
    { 
      range: '8-12%', 
      label: 'Athletic', 
      description: 'Very lean, visible abs, minimal body fat',
      icon: '💪',
      characteristics: 'Defined muscles, visible veins, very low fat storage'
    },
    { 
      range: '13-17%', 
      label: 'Fit', 
      description: 'Lean, some muscle definition visible',
      icon: '🏃',
      characteristics: 'Good muscle tone, flat stomach, healthy appearance'
    },
    { 
      range: '18-24%', 
      label: 'Average', 
      description: 'Healthy range for most people',
      icon: '👤',
      characteristics: 'Normal body composition, some softness around midsection'
    },
    { 
      range: '25-31%', 
      label: 'Above Average', 
      description: 'Some excess fat, still within healthy range',
      icon: '🙂',
      characteristics: 'Noticeable fat around waist and hips, less muscle definition'
    },
    { 
      range: '32-38%', 
      label: 'High', 
      description: 'Higher body fat, may benefit from reduction',
      icon: '⚠️',
      characteristics: 'Significant fat storage, reduced muscle visibility'
    }
  ];

  return (
    <div className="text-center">
      {/* Input Method Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => setInputMethod('manual')}
          className={`p-3 rounded-lg border-2 transition-all ${
            inputMethod === 'manual' 
              ? 'border-pat-purple-500 bg-pat-purple-50' 
              : 'border-gray-300 hover:border-pat-purple-300'
          }`}
        >
          <div className="text-sm font-medium text-gray-900">Manual Entry</div>
        </button>
        
        <button
          onClick={() => {
            setInputMethod('visual');
            setShowVisualEstimator(true);
          }}
          className={`p-3 rounded-lg border-2 transition-all ${
            inputMethod === 'visual' 
              ? 'border-pat-purple-500 bg-pat-purple-50' 
              : 'border-gray-300 hover:border-pat-purple-300'
          }`}
        >
          <div className="text-sm font-medium text-gray-900">Visual Guide</div>
        </button>
      </div>

      {/* Manual Input */}
      {inputMethod === 'manual' && (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="number"
              value={bodyFatInput}
              onChange={handleManualInput}
              placeholder="Enter body fat %"
              min="3"
              max="60"
              step="0.1"
              className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pat-purple-500 focus:border-transparent text-center text-2xl font-semibold"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
              %
            </div>
          </div>
          
          {bodyFatInput && !validateBodyFat(parseFloat(bodyFatInput)) && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">Please enter a body fat percentage between 3% and 38%.</p>
            </div>
          )}
          
          {bodyFatInput && validateBodyFat(parseFloat(bodyFatInput)) && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">✓ Body fat percentage recorded.</p>
            </div>
          )}
        </div>
      )}

      {/* Visual Estimator */}
      {showVisualEstimator && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Select the range that best matches your body type:</h3>
          <div key="body-fat-ranges-grid" className="grid grid-cols-1 gap-3">
            {bodyFatRanges.map((range, index) => (
              <button
                key={index}
                onClick={() => handleVisualSelection(parseFloat(range.range.split('-')[0]) + 2)} // Use middle of range
                className="p-4 border border-gray-300 rounded-lg hover:border-pat-purple-500 hover:bg-pat-purple-50 transition-all text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{range.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-900">{range.range}</div>
                        <div className="text-pat-purple-600 font-medium">{range.label}</div>
                      </div>
                    </div>
                    <div className="text-gray-600 text-sm mb-2">{range.description}</div>
                    <div className="text-gray-500 text-xs italic">{range.characteristics}</div>
                  </div>
                  <div className="w-16 h-16 ml-4 rounded-lg bg-gradient-to-br from-pat-purple-100 to-pat-purple-200 flex items-center justify-center">
                    <User size={24} className="text-pat-purple-600" />
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowVisualEstimator(false)}
            className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            Back to Manual Entry
          </button>
        </div>
      )}

      {/* Skip Option */}
    </div>
  );
};