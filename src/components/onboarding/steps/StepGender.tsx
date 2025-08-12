import React from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { User, Users } from 'lucide-react';

export const StepGender: React.FC = () => {
  const { userData, updateUserData, setStepValidity, currentStep } = useOnboarding();

  const handleGenderChange = (gender: 'male' | 'female') => {
    updateUserData('gender', gender);
    setStepValidity(currentStep, true);
  };

  React.useEffect(() => {
    // Set initial validity based on existing data
    setStepValidity(currentStep, !!userData.gender);
  }, [setStepValidity, currentStep, userData.gender]);

  return (
    <div className="text-center">
      <div className="grid grid-cols-2 gap-4">
        <label className={`flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
          userData.gender === 'male' 
            ? 'border-pat-blue-500 bg-pat-blue-50' 
            : 'border-gray-300 hover:border-pat-blue-300'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
            userData.gender === 'male' ? 'bg-pat-blue-500' : 'bg-gray-200'
          }`}>
            <User size={24} className={userData.gender === 'male' ? 'text-white' : 'text-gray-500'} />
          </div>
          <input
            type="radio"
            name="gender"
            value="male"
            checked={userData.gender === 'male'}
            onChange={() => handleGenderChange('male')}
            className="sr-only"
          />
          <span className={`font-semibold ${userData.gender === 'male' ? 'text-pat-blue-700' : 'text-gray-700'}`}>
            Male
          </span>
        </label>
        
        <label className={`flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
          userData.gender === 'female' 
            ? 'border-pat-purple-500 bg-pat-purple-50' 
            : 'border-gray-300 hover:border-pat-purple-300'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
            userData.gender === 'female' ? 'bg-pat-purple-500' : 'bg-gray-200'
          }`}>
            <Users size={24} className={userData.gender === 'female' ? 'text-white' : 'text-gray-500'} />
          </div>
          <input
            type="radio"
            name="gender"
            value="female"
            checked={userData.gender === 'female'}
            onChange={() => handleGenderChange('female')}
            className="sr-only"
          />
          <span className={`font-semibold ${userData.gender === 'female' ? 'text-pat-purple-700' : 'text-gray-700'}`}>
            Female
          </span>
        </label>
      </div>
    </div>
  );
};