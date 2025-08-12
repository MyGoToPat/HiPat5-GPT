import React from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { Utensils } from 'lucide-react';

type DietaryPreference = 'carnivore_keto' | 'ketovore' | 'low_carb' | 'balanced_omnivore';

const dietaryOptions: { 
  value: DietaryPreference; 
  label: string; 
  description: string;
  icon: string;
}[] = [
  { 
    value: 'balanced_omnivore', 
    label: 'Balanced Omnivore', 
    description: 'Balanced approach with all food groups',
    icon: '🍽️'
  },
  { 
    value: 'ketovore', 
    label: 'Ketovore', 
    description: 'Mostly animal foods with some plants',
    icon: '🥑'
  },
  { 
    value: 'low_carb', 
    label: 'Low Carb', 
    description: 'Moderate carbs, higher fat and protein',
    icon: '🥗'
  },
  { 
    value: 'carnivore_keto', 
    label: 'Carnivore/Keto', 
    description: 'Very low carb, high fat approach',
    icon: '🥩'
  },
];

export const StepDietaryPreference: React.FC = () => {
  const { userData, updateUserData, setStepValidity, currentStep } = useOnboarding();

  const handlePreferenceChange = (preference: DietaryPreference) => {
    updateUserData('dietaryPreference', preference);
    setStepValidity(currentStep, true);
  };

  React.useEffect(() => {
    // Set initial validity based on existing data, default to balanced_omnivore
    if (!userData.dietaryPreference) {
      updateUserData('dietaryPreference', 'balanced_omnivore');
      setStepValidity(currentStep, true);
    } else {
      setStepValidity(currentStep, true);
    }
  }, [setStepValidity, currentStep, userData.dietaryPreference, updateUserData]);

  return (
    <div key="dietary-preference-step" className="text-center">
      <div className="space-y-3">
        {dietaryOptions.map((option) => (
          <label
            key={option.value}
            className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
              userData.dietaryPreference === option.value 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-300 hover:border-green-300'
            }`}
          >
            <div className="text-2xl mr-4">{option.icon}</div>
            
            <input
              type="radio"
              name="dietaryPreference"
              value={option.value}
              checked={userData.dietaryPreference === option.value}
              onChange={() => handlePreferenceChange(option.value)}
              className="sr-only"
            />
            
            <div className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${userData.dietaryPreference === option.value ? 'text-green-700' : 'text-gray-700'}`}>
                  {option.label}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{option.description}</p>
            </div>
          </label>
        ))}
      </div>
      
      {userData.dietaryPreference && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600 text-sm">
            ✓ Preference set: {dietaryOptions.find(o => o.value === userData.dietaryPreference)?.label}
          </p>
        </div>
      )}
    </div>
  );
};