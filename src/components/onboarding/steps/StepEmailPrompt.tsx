import React, { useState } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { Mail, User, Save, Send } from 'lucide-react';
import { getSupabase } from '../../../lib/supabase';
import { trackTDEEWizardCompleted } from '../../../lib/analytics';

export const StepEmailPrompt: React.FC = () => {
  const { saveLead, saveToProfile, isLoggedIn, setStepValidity, currentStep, calculatedMacros } = useOnboarding();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  React.useEffect(() => {
    // This step is always valid - user can choose to skip
    setStepValidity(currentStep, true);
  }, [setStepValidity, currentStep]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendEmail = async () => {
    if (!name.trim() || !validateEmail(email)) return;
    
    setIsSubmitting(true);
    try {
      await saveLead(name.trim(), email.trim());
      setIsComplete(true);
    } catch (error) {
      console.error('Failed to save lead:', error);
      // TODO: Show error message
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveToProfile = async () => {
    setIsSubmitting(true);
    try {
      const supabase = getSupabase();
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('No authenticated user');
      }

      // Save calculated macros to user_metrics table
      const { error } = await supabase
        .from('user_metrics')
        .upsert({
          user_id: user.data.user.id,
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
        throw error;
      }

      // Track TDEE wizard completion
      trackTDEEWizardCompleted(
        user.data.user.id, 
        calculatedMacros.tdee || 0, 
        calculatedMacros.chosenBmr || 0
      );

      setIsComplete(true);
    } catch (error) {
      console.error('Failed to save TDEE data:', error);
      alert('Failed to save your data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    // For logged-in users, save macros before finishing
    if (isLoggedIn) {
      setIsSubmitting(true);
      try {
        await handleSaveToProfile();
      } catch (error) {
        console.error('Failed to save on finish:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send size={24} className="text-green-600" />
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">All Set!</h2>
        <p className="text-gray-600 mb-6">
          {sendEmail && name && email 
            ? `Your macro plan has been sent to ${email}!` 
            : 'Your macro plan is ready to use!'}
        </p>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-600 text-sm">
            🎉 Welcome to your personalized nutrition journey with Pat!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Mail size={24} className="text-blue-600" />
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-800 mb-3">Keep Your Results</h2>
      <p className="text-gray-600 mb-8 text-sm">Want to keep these results handy? I can email your plan or save it to your profile!</p>
      
      {/* Email Option */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input
            type="checkbox"
            id="sendEmail"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="sendEmail" className="text-blue-800 font-medium">
            Email my macro plan to me
          </label>
        </div>

        {sendEmail && (
          <div className="space-y-3">
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {sendEmail && (
          <button
            onClick={handleSendEmail}
            disabled={!name.trim() || !validateEmail(email) || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Send size={20} />
                Send My Plan
              </>
            )}
          </button>
        )}

        {isLoggedIn && (
          <button
            onClick={handleSaveToProfile}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={20} />
                Save to Profile
              </>
            )}
          </button>
        )}

        <button
          onClick={handleFinish}
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-700 rounded-lg font-medium transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Finish'}
        </button>
      </div>

      {/* Privacy Note */}
      <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600 text-xs">
          🔒 Your information is secure and will only be used to send your macro plan. We respect your privacy.
        </p>
      </div>
    </div>
  );
};