import React from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { Activity, Zap, Target, TrendingUp, Flame } from 'lucide-react';

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'super';

const activityLevels: { 
  value: ActivityLevel; 
  label: string; 
  description: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  color: string;
  bgColor: string;
}[] = [
  { 
    value: 'sedentary', 
    label: 'Sedentary', 
    description: 'Little or no exercise, desk job',
    icon: Activity,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  { 
    value: 'light', 
    label: 'Lightly Active', 
    description: 'Light exercise 1-3 days/week',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  { 
    value: 'moderate', 
    label: 'Moderately Active', 
    description: 'Moderate exercise 3-5 days/week',
    icon: Target,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  { 
    value: 'very', 
    label: 'Very Active', 
    description: 'Hard exercise 6-7 days/week',
    icon: TrendingUp,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
];

export const StepActivityLevel: React.FC = () => {
  const { userData, updateUserData, setStepValidity, currentStep } = useOnboarding();

  const handleActivityChange = (level: ActivityLevel) => {
    updateUserData('activityLevel', level);
    setStepValidity(currentStep, true);
  };

  React.useEffect(() => {
    // Set initial validity based on existing data
    setStepValidity(currentStep, !!userData.activityLevel);
  }, [setStepValidity, currentStep, userData.activityLevel]);

  return (
    <div key="activity-level-step" className="text-center">
      <div className="space-y-3">
        {activityLevels.map((level) => {
          const IconComponent = level.icon;
          const isSelected = userData.activityLevel === level.value;
          
          return (
            <label
              key={level.value}
              className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                isSelected 
                  ? 'border-pat-blue-500 bg-pat-blue-50' 
                  : 'border-gray-300 hover:border-pat-blue-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                isSelected ? 'bg-pat-blue-500' : level.bgColor
              }`}>
                <IconComponent size={20} className={isSelected ? 'text-white' : level.color} />
              </div>
              
              <input
                type="radio"
                name="activityLevel"
                value={level.value}
                checked={isSelected}
                onChange={() => handleActivityChange(level.value)}
                className="sr-only"
              />
              
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold ${isSelected ? 'text-pat-blue-700' : 'text-gray-700'}`}>
                    {level.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{level.description}</p>
              </div>
            </label>
          );
        })}
      </div>
      
      {userData.activityLevel && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600 text-sm">
            ✓ Activity level: {activityLevels.find(l => l.value === userData.activityLevel)?.label}
          </p>
        </div>
      )}
    </div>
  );
};