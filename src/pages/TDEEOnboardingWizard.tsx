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
  const { currentStep, calculatedMacros } = useOnboarding();

  // Handle wizard completion and mark TDEE as completed in database
  useEffect(() => {
    if (currentStep > 11 && onComplete) {
      // Mark TDEE as completed in the database
      (async () => {
        try {
          const { getSupabase } = await import('../lib/supabase');
          const { markTDEECompleted } = await import('../lib/personality/contextChecker');

          const supabase = getSupabase();
          const { data: { user } } = await supabase.auth.getUser();

          if (user && calculatedMacros.tdee && calculatedMacros.chosenBmr) {
            await markTDEECompleted(user.id, {
              tdee: calculatedMacros.tdee,
              bmr: calculatedMacros.chosenBmr,
              macros: {
                protein: calculatedMacros.proteinG || 0,
                carbs: calculatedMacros.carbG || 0,
                fat: calculatedMacros.fatG || 0,
                calories: calculatedMacros.netCal || calculatedMacros.tdee
              },
              calculated_at: new Date().toISOString()
            });
            console.log('TDEE marked as completed in database');
          }
        } catch (error) {
          console.error('Failed to mark TDEE completed:', error);
          // Don't block wizard completion if this fails
        }
      })();

      onComplete();
    }
  }, [currentStep, onComplete, calculatedMacros]);
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