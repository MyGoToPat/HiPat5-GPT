import React from 'react';
import { PatAvatar } from '../PatAvatar';
import { useOnboarding } from '../../context/OnboardingContext';
import { stepPrompts } from '../../utils/stepPrompts';

export const PatHeader: React.FC = () => {
  const { currentStep } = useOnboarding();
  const prompt = stepPrompts[currentStep] || "Hello! I'm Pat.";

  return (
    <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <PatAvatar size={64} mood="happy" animated={true} />
      <div className="flex-1 bg-white/10 backdrop-blur-sm p-4 rounded-lg relative">
        <p className="text-white font-medium">{prompt}</p>
        <div className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[10px] border-r-white/10"></div>
      </div>
    </div>
  );
};