import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../../context/OnboardingContext';
import { CheckCircle, Activity, TrendingUp, Target } from 'lucide-react';
import { getSupabase } from '../../../lib/supabase';
import { trackTDEEWizardCompleted } from '../../../lib/analytics';
import toast from 'react-hot-toast';

export const StepCompletion: React.FC = () => {
  const navigate = useNavigate();
  const { calculatedMacros, setStepValidity, currentStep } = useOnboarding();
  const [countdown, setCountdown] = React.useState(5);
  const [isSaving, setIsSaving] = React.useState(true);

  useEffect(() => {
    setStepValidity(currentStep, true);
  }, [setStepValidity, currentStep]);

  // Auto-save macros to profile for logged-in users
  useEffect(() => {
    const saveMacros = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsSaving(false);
          return;
        }

        // Save calculated macros to user_metrics table
        const { error } = await supabase
          .from('user_metrics')
          .upsert({
            user_id: user.id,
            bmr: calculatedMacros.chosenBmr,
            tdee: calculatedMacros.tdee,
            protein_g: calculatedMacros.proteinG,
            carbs_g: calculatedMacros.carbG,
            fat_g: calculatedMacros.fatG,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('Failed to save macros:', error);
          toast.error('Failed to save your plan');
        } else {
          // Track completion
          trackTDEEWizardCompleted(
            user.id,
            calculatedMacros.tdee || 0,
            calculatedMacros.chosenBmr || 0
          );
        }
      } catch (error) {
        console.error('Error saving macros:', error);
      } finally {
        setIsSaving(false);
      }
    };

    saveMacros();
  }, [calculatedMacros]);

  useEffect(() => {
    if (isSaving) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSaving, navigate]);

  const handleViewDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="text-center max-w-md mx-auto">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-green-600" />
      </div>

      {/* Congratulatory Message */}
      <h2 className="text-3xl font-bold text-gray-900 mb-3">
        Congratulations!
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        Your personalized macro plan is ready
      </p>

      {/* Results Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Activity size={20} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {calculatedMacros.tdee || 0}
            </p>
            <p className="text-sm text-gray-600">Daily Calories</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target size={20} className="text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {calculatedMacros.proteinG || 0}g
            </p>
            <p className="text-sm text-gray-600">Protein Target</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-700">
            <div>
              <span className="font-semibold">{calculatedMacros.carbG || 0}g</span> carbs
            </div>
            <div>
              <span className="font-semibold">{calculatedMacros.fatG || 0}g</span> fat
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 text-left">
        <div className="flex items-start gap-3 mb-4">
          <TrendingUp size={20} className="text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">What's Next?</h3>
            <p className="text-sm text-gray-600">
              Your personalized plan is now active in your dashboard. Start tracking your meals and see your progress in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleViewDashboard}
        disabled={isSaving}
        className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
      >
        {isSaving ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Saving Your Plan...
          </span>
        ) : (
          'View My Dashboard'
        )}
      </button>

      {!isSaving && countdown > 0 && (
        <p className="text-sm text-gray-500 mt-4">
          Redirecting automatically in {countdown}s...
        </p>
      )}

      {!isSaving && countdown === 0 && (
        <p className="text-sm text-green-600 mt-4 font-medium">
          Redirecting now...
        </p>
      )}
    </div>
  );
};
