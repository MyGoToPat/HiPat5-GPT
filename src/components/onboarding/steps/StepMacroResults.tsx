import React from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { Calculator, Target, Zap, TrendingUp } from 'lucide-react';

export const StepMacroResults: React.FC = () => {
  const { userData, calculatedMacros, setStepValidity, currentStep } = useOnboarding();

  React.useEffect(() => {
    // This step is always valid since it's just displaying results
    setStepValidity(currentStep, true);
  }, [setStepValidity, currentStep]);

  if (!calculatedMacros.chosenBmr || !calculatedMacros.tdee) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calculator size={24} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">Calculation Error</h2>
        <p className="text-gray-600 mb-6">
          Unable to calculate your macros. Please go back and check your information.
        </p>
      </div>
    );
  }

  const getFormulaDisplayName = (formula: string) => {
    switch (formula) {
      case 'mifflin': return 'Mifflin-St Jeor';
      case 'katch': return 'Katch-McArdle';
      case 'average': return 'Average of Both';
      default: return 'Mifflin-St Jeor';
    }
  };

  const formulaUsed = getFormulaDisplayName(calculatedMacros.formulaUsed || 'mifflin');

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Target size={24} className="text-green-600" />
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-800 mb-3">Your Personalized Macros</h2>
      <p className="text-gray-600 mb-8 text-sm">
        Here's your science-backed nutrition blueprint calculated using the {formulaUsed} formula!
      </p>

      {/* Main Results Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* BMR */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-800">BMR</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{calculatedMacros.chosenBmr}</div>
          <div className="text-xs text-blue-700">calories/day</div>
          <div className="text-xs text-blue-600 mt-1">Formula: {calculatedMacros.formulaUsed || 'mifflin'}</div>
        </div>

        {/* TDEE */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp size={16} className="text-purple-600" />
            <span className="text-sm font-medium text-purple-800">TDEE</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{calculatedMacros.tdee}</div>
          <div className="text-xs text-purple-700">calories/day</div>
        </div>
      </div>

      {/* Macro Breakdown */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Macro Targets</h3>
        
        <div className="grid grid-cols-3 gap-4">
          {/* Protein */}
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-red-600 font-bold text-sm">P</span>
            </div>
            <div className="text-xl font-bold text-red-700">{calculatedMacros.proteinG}g</div>
            <div className="text-xs text-gray-600">{calculatedMacros.proteinCal} cal</div>
            <div className="text-xs text-red-600 font-medium">Protein</div>
          </div>

          {/* Carbs */}
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-blue-600 font-bold text-sm">C</span>
            </div>
            <div className="text-xl font-bold text-blue-700">{calculatedMacros.carbG}g</div>
            <div className="text-xs text-gray-600">{calculatedMacros.carbCal} cal</div>
            <div className="text-xs text-blue-600 font-medium">Carbs</div>
          </div>

          {/* Fat */}
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-yellow-600 font-bold text-sm">F</span>
            </div>
            <div className="text-xl font-bold text-yellow-700">{calculatedMacros.fatG}g</div>
            <div className="text-xs text-gray-600">{calculatedMacros.fatCal} cal</div>
            <div className="text-xs text-yellow-600 font-medium">Fat</div>
          </div>
        </div>
      </div>

      {/* TEF Information */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-purple-800 mb-2">Thermic Effect of Food (TEF)</h4>
        <p className="text-sm text-purple-700 mb-2">
          Your body burns <span className="font-bold">{calculatedMacros.tefCal} calories</span> just digesting food!
        </p>
        <p className="text-xs text-purple-600">
          Net calories available for energy: {calculatedMacros.netCal}
        </p>
      </div>

      {/* Formula Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-2">Calculation Details</h4>
        
        {/* BMR Details */}
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h5 className="font-medium text-blue-800 mb-2">BMR Calculation</h5>
          <div className="text-xs text-blue-700 space-y-1">
            <div>Chosen BMR: <span className="font-bold">{calculatedMacros.chosenBmr} calories</span> (Formula: {formulaUsed})</div>
            {calculatedMacros.mifflinBmr && (
              <div>Mifflin-St Jeor: {calculatedMacros.mifflinBmr} calories</div>
            )}
            {calculatedMacros.katchBmr && (
              <div>Katch-McArdle: {calculatedMacros.katchBmr} calories</div>
            )}
          </div>
        </div>
        
        <ul className="text-xs text-gray-600 space-y-1 text-left">
          <li>
            • Formula used: <span className="font-medium">{formulaUsed}</span>
          </li>
          <li>
            • {calculatedMacros.formulaUsed === 'katch'
              ? `Katch-McArdle chosen for lean body composition.`
              : calculatedMacros.formulaUsed === 'average'
              ? `Average of both formulas for balanced accuracy.`
              : `Mifflin-St Jeor chosen as the most appropriate formula.`
            }
          </li>
          <li>
            • Activity multiplier: {userData.activityLevel === 'sedentary' ? '1.2x' :
                                   userData.activityLevel === 'light' ? '1.375x' :
                                   userData.activityLevel === 'moderate' ? '1.55x' :
                                   userData.activityLevel === 'very' ? '1.725x' : '1.55x'}
          </li>
          <li>
            • Dietary preference: {userData.dietaryPreference === 'carnivore_keto' ? 'Carnivore/Keto (75% fat)' :
                                  userData.dietaryPreference === 'ketovore' ? 'Ketovore (65% fat)' :
                                  userData.dietaryPreference === 'low_carb' ? 'Low Carb (35% fat)' :
                                  'Balanced Omnivore (27.5% fat)'}
          </li>
        </ul>
      </div>

      {/* Success Message */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-600 text-sm font-medium">
          🎉 Your personalized macro plan is ready! These targets are scientifically calculated for your unique profile.
        </p>
      </div>
    </div>
  );
};