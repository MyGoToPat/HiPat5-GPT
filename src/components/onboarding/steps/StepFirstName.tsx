import React, { useState } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { User } from 'lucide-react';

export const StepFirstName: React.FC = () => {
  const { userData, updateUserData, setStepValidity, currentStep } = useOnboarding();
  const [firstName, setFirstName] = useState<string>(userData.firstName || '');

  const validateName = (name: string): boolean => {
    return typeof name === 'string' && name.trim().length > 0;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFirstName(value);
    
    const isValid = validateName(value);
    updateUserData('firstName', typeof value === 'string' ? value.trim() : '');
    setStepValidity(currentStep, isValid);
  };

  // Initialize validity on mount based on existing data
  React.useEffect(() => {
    const isValid = validateName(firstName);
    setStepValidity(currentStep, isValid);
  }, [setStepValidity, currentStep]);

  return (
    <div className="text-center">
      <div className="space-y-4">
        <input
          type="text"
          value={firstName}
          onChange={handleNameChange}
          placeholder="Enter your first name"
          className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl font-medium"
          autoComplete="given-name"
          maxLength={50}
        />
        
        {firstName.trim() && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-600 text-sm">
              ✓ Great to meet you, {firstName.trim()}!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};