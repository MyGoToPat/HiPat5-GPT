import React, { ReactNode } from 'react';

interface OnboardingStepProps {
  children: ReactNode;
}

export const OnboardingStep: React.FC<OnboardingStepProps> = ({ children }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg w-full max-w-[90%] mx-auto sm:max-w-lg border border-gray-200 relative overflow-hidden">
      {children}
    </div>
  );
};