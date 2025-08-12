import React, { useEffect } from 'react';
import { OnboardingProvider, useOnboarding } from '../context/OnboardingContext';
import { WizardLayout } from '../components/onboarding/WizardLayout';
import { OnboardingStep } from '../components/onboarding/OnboardingStep';
import { StepWelcome } from '../components/onboarding/steps/StepWelcome';
import { StepFirstName } from '../components/onboarding/steps/StepFirstName';
import { StepGender } from '../components/onboarding/steps/StepGender';
import { StepAge } from '../components/onboarding/steps/StepAge';
import { StepHeight } from '../components/onboarding/steps/StepHeight';
import { StepWeight } from '../components/onboarding/steps/StepWeight';
import { StepActivityLevel } from '../components/onboarding/steps/StepActivityLevel';
import { StepBodyFat } from '../components/onboarding/steps/StepBodyFat';
import { StepDietaryPreference } from '../components/onboarding/steps/StepDietaryPreference';
import { StepReviewInputs } from '../components/onboarding/steps/StepReviewInputs';
import { StepMacroResults } from '../components/onboarding/steps/StepMacroResults';
import { StepEmailPrompt } from '../components/onboarding/steps/StepEmailPrompt';

interface TDEEOnboardingWizardProps {
  onComplete?: () => void;
}
const TDEEOnboardingWizardContent: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { currentStep } = useOnboarding();

  // Handle wizard completion
  useEffect(() => {
    if (currentStep > 11 && onComplete) {
      onComplete();
    }
  }, [currentStep, onComplete]);
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <OnboardingStep><StepWelcome /></OnboardingStep>;
      case 1:
        return <OnboardingStep><StepFirstName /></OnboardingStep>;
      case 2:
        return <OnboardingStep><StepGender /></OnboardingStep>;
      case 3:
        return <OnboardingStep><StepAge /></OnboardingStep>;
      case 4:
        return <OnboardingStep><StepHeight /></OnboardingStep>;
      case 5:
        return <OnboardingStep><StepWeight /></OnboardingStep>;
      case 6:
        return <OnboardingStep><StepActivityLevel /></OnboardingStep>;
      case 7:
        return <OnboardingStep><StepBodyFat /></OnboardingStep>;
      case 8:
        return <OnboardingStep><StepDietaryPreference /></OnboardingStep>;
      case 9:
        return <OnboardingStep><StepReviewInputs /></OnboardingStep>;
      case 10:
        return <OnboardingStep><StepMacroResults /></OnboardingStep>;
      case 11:
        return <OnboardingStep><StepEmailPrompt /></OnboardingStep>;
      default:
        return (
          <OnboardingStep>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {currentStep > 11 ? 'Wizard Complete!' : 'Invalid Step'}
              </h2>
              <p className="text-gray-600">
                {currentStep > 11 
                  ? 'Thank you for using Pat\'s Macro Calculator!'
                  : 'Something went wrong with the wizard navigation.'
                }
              </p>
            </div>
          </OnboardingStep>
        );
    }
  };

  return (
    <WizardLayout>
      {renderStep()}
    </WizardLayout>
  );
};

const TDEEOnboardingWizard: React.FC<TDEEOnboardingWizardProps> = ({ onComplete }) => {
  return (
    <OnboardingProvider>
      <TDEEOnboardingWizardContent onComplete={onComplete} />
    </OnboardingProvider>
  );
};

export default TDEEOnboardingWizard;