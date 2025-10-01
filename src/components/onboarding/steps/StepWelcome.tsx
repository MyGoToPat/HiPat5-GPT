import React from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { Zap, Target, Calculator } from 'lucide-react';

export const StepWelcome: React.FC = () => {
  const { setStepValidity, currentStep, userData, isLoggedIn } = useOnboarding();

  // This step is always valid to proceed
  React.useEffect(() => {
    setStepValidity(currentStep, true);
  }, [setStepValidity, currentStep]);

  // Create personalized greeting
  const greeting = userData.firstName && isLoggedIn
    ? `Hi ${userData.firstName}, I'm Pat. Let's build YOUR macro plan.`
    : "Hi, I'm Pat. Let's build YOUR macro plan.";

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{greeting}</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="text-center p-3 bg-pat-purple-50 rounded-lg">
          <Zap size={24} className="text-pat-purple-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-pat-purple-800">Precise Basal Metabolic Rate BMR</p>
        </div>
        <div className="text-center p-3 bg-pat-blue-50 rounded-lg">
          <Calculator size={24} className="text-pat-blue-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-pat-blue-800">Total Daily Energy Expenditure TDEE</p>
        </div>
        <div className="text-center p-3 bg-pat-purple-50 rounded-lg">
          <Target size={24} className="text-pat-purple-600 mx-auto mb-2" />
          <p className="text-xs font-medium text-pat-purple-800">Custom Macros</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4">Takes about 2 minutes • Science-backed results</p>
    </div>
  );
};