import React from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { CheckCircle, Edit3 } from 'lucide-react';

export const StepReviewInputs: React.FC = () => {
  const { userData, goToStep, setStepValidity, currentStep } = useOnboarding();

  React.useEffect(() => {
    // This step is always valid since it's just a review
    setStepValidity(currentStep, true);
  }, [setStepValidity, currentStep]);

  const formatHeight = () => {
    if (!userData.height) return 'Not provided';
    const cm = userData.height.value;
    const feet = Math.floor(cm / 30.48);
    const inches = Math.round((cm / 2.54) % 12);
    return `${feet}'${inches}" (${cm.toFixed(1)} cm)`;
  };

  const formatWeight = () => {
    if (!userData.weight) return 'Not provided';
    const kg = userData.weight.value;
    const lbs = kg * 2.20462;
    return `${lbs.toFixed(1)} lbs (${kg.toFixed(1)} kg)`;
  };

  const formatActivityLevel = () => {
    const levels = {
      sedentary: 'Sedentary (1.2x)',
      light: 'Lightly Active (1.375x)',
      moderate: 'Moderately Active (1.55x)',
      very: 'Very Active (1.725x)',
      super: 'Super Active (1.9x)'
    };
    return userData.activityLevel ? levels[userData.activityLevel] : 'Not selected';
  };

  const formatDietaryPreference = () => {
    const prefs = {
      carnivore_keto: 'Carnivore/Keto (70-80% fat)',
      ketovore: 'Ketovore (60-70% fat)',
      low_carb: 'Low Carb (30-40% fat)',
      balanced_omnivore: 'Balanced Omnivore (25-30% fat)'
    };
    return userData.dietaryPreference ? prefs[userData.dietaryPreference] : 'Balanced Omnivore';
  };

  const reviewItems = [
    {
      label: 'First Name',
      value: userData.firstName || 'Not provided',
      editStep: 1
    },
    {
      label: 'Biological Sex',
      value: userData.gender && typeof userData.gender === 'string' ? userData.gender.charAt(0).toUpperCase() + userData.gender.slice(1) : 'Not selected',
      editStep: 2
    },
    {
      label: 'Date of Birth',
      value: userData.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) + ` (${userData.age} years old)` : 'Not provided',
      editStep: 3
    },
    {
      label: 'Height',
      value: formatHeight(),
      editStep: 4
    },
    {
      label: 'Weight',
      value: formatWeight(),
      editStep: 5
    },
    {
      label: 'Activity Level',
      value: formatActivityLevel(),
      editStep: 6
    },
    {
      label: 'Body Fat %',
      value: userData.bodyFatPercent ? `${userData.bodyFatPercent}%` : 'Not provided (will use Mifflin-St Jeor)',
      editStep: 7
    },
    {
      label: 'Dietary Preference',
      value: formatDietaryPreference(),
      editStep: 8
    }
  ];

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={24} className="text-blue-600" />
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-800 mb-3">Review Your Information</h2>
      <p className="text-gray-600 mb-8 text-sm">Double-check everything below. Accuracy is key for your personalized plan!</p>
      
      <div className="space-y-3 text-left">
        {reviewItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{item.label}</div>
              <div className="text-gray-600 text-sm">{item.value}</div>
            </div>
            <button
              onClick={() => goToStep(item.editStep)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              title={`Edit ${item.label}`}
            >
              <Edit3 size={16} className="text-gray-500" />
            </button>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-600 text-sm">
          ✓ All information looks good! Ready to calculate your personalized macros.
        </p>
      </div>
    </div>
  );
};