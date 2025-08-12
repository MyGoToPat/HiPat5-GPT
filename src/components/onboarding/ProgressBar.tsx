import React from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

interface ProgressBarProps {
  totalSteps?: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ totalSteps = 12, className = '' }) => {
  const { currentStep } = useOnboarding();
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={`px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white/80">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-sm text-white/60">{Math.round(progress)}% complete</span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-2">
        <div
          className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};