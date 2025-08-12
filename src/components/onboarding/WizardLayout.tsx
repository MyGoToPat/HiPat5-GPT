import React, { ReactNode } from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import { PatAvatar } from '../PatAvatar';
import { ProgressBar } from './ProgressBar';
import { stepPrompts } from '../../utils/stepPrompts';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface WizardLayoutProps {
  children: ReactNode;
}

export const WizardLayout: React.FC<WizardLayoutProps> = ({ children }) => {
  const { currentStep, goToNextStep, goToPreviousStep, stepValidity, userData } = useOnboarding();

  const isNextEnabled = stepValidity.get(currentStep) === true;
  const isBackEnabled = currentStep > 0;
  const isLastStep = currentStep >= 11; // Assuming 12 total steps (0-11)
  
  // Get the base prompt and personalize it with the user's first name
  const basePrompt = stepPrompts[currentStep] || "Hello! I'm Pat.";
  const firstName = typeof userData.firstName === 'string' ? userData.firstName.trim() : undefined;
  
  // Replace [FirstName] placeholder with actual name or fallback
  const prompt = basePrompt.replace(
    /\[FirstName\]/g, 
    firstName || "friend"
  );

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger navigation if user is typing in an input field
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      
      // Allow navigation from input fields only for specific keys
      if (isInputField) {
        // Only handle Enter/Return and arrow keys from input fields
        if (!['Enter', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(event.code)) {
          return;
        }
        
        // For Backspace in input fields, only navigate if field is empty
        if (event.code === 'Backspace' && (target as HTMLInputElement).value) {
          return;
        }
      }

      switch (event.code) {
        case 'Enter':
        case 'NumpadEnter':
        case 'ArrowRight':
          if (isNextEnabled) {
            event.preventDefault();
            goToNextStep();
          }
          break;
        
        case 'Backspace':
        case 'ArrowLeft':
          if (isBackEnabled) {
            event.preventDefault();
            goToPreviousStep();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, isNextEnabled, isBackEnabled, goToNextStep, goToPreviousStep]);
  return (
    <div className="min-h-screen bg-pat-gradient flex flex-col w-full overflow-x-hidden">
      {/* Pat Avatar, Message, and Progress */}
      <div className="flex flex-col items-center pt-6 pb-2 gap-4">
        <ProgressBar className="w-4/5" />
        
        <PatAvatar size={128} mood="neutral" animated={true} />
        
        <div className="text-white font-medium leading-relaxed text-center max-w-xs mx-auto">
          {prompt}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        {children}
      </div>

      <div className="p-6 flex gap-2 justify-center bg-white/10 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={goToPreviousStep}
          disabled={!isBackEnabled}
          className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <button
          onClick={goToNextStep}
          disabled={!isNextEnabled}
          className="flex items-center gap-2 px-6 py-3 bg-white text-pat-purple-600 rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg"
        >
          {isLastStep ? 'Finish' : 'Next'}
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};