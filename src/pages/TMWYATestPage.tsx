import React, { useState } from 'react';
import { FoodVerificationScreen } from '../components/FoodVerificationScreen';
import { runTMWYAPipeline, logVerifiedMeal } from '../lib/tmwya/pipeline';
import { useAuth } from '../hooks/useAuth';
import type { AnalysisResult, NormalizedMealData, TDEEComparison } from '../types/food';
import { Mic, Type, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const TMWYATestPage: React.FC = () => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [tdeeComparison, setTdeeComparison] = useState<TDEEComparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await runTMWYAPipeline({
        userMessage: input,
        source: 'text',
        userId: user.id
      });

      if (!result.ok) {
        setError(result.error || 'Failed to process input');
        setIsProcessing(false);
        return;
      }

      setAnalysisResult(result.analysisResult!);
      setTdeeComparison(result.tdeeComparison!);
      setIsProcessing(false);

    } catch (err: any) {
      console.error('TMWYA error:', err);
      setError(err.message || 'Unknown error occurred');
      setIsProcessing(false);
    }
  };

  const handleConfirm = async (normalizedMeal: NormalizedMealData) => {
    setIsProcessing(true);
    try {
      const result = await logVerifiedMeal(normalizedMeal);

      if (!result.ok) {
        toast.error(result.error || 'Failed to log meal');
        setIsProcessing(false);
        return;
      }

      setSuccessMessage('Meal logged successfully! Check your dashboard for updated stats.');
      toast.success('Meal logged!');

      // Reset for next entry
      setTimeout(() => {
        setAnalysisResult(null);
        setTdeeComparison(null);
        setInput('');
        setSuccessMessage(null);
      }, 3000);

    } catch (err: any) {
      console.error('Log meal error:', err);
      toast.error(err.message || 'Failed to log meal');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setAnalysisResult(null);
    setTdeeComparison(null);
    setError(null);
  };

  // Show verification screen if we have analysis results
  if (analysisResult) {
    return (
      <FoodVerificationScreen
        analysisResult={analysisResult}
        tdeeComparison={tdeeComparison}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={isProcessing}
        error={error || undefined}
      />
    );
  }

  // Show input form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tell Me What You Ate
            </h1>
            <p className="text-gray-600">
              Log your meals with natural language - I'll handle the rest!
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-green-800 text-sm">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What did you eat?
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Example: I had two eggs, toast, and a banana for breakfast"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                disabled={isProcessing}
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Type size={20} />
                  Log Meal
                </>
              )}
            </button>
          </form>

          {/* Examples */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Try these examples:</h3>
            <div className="space-y-2">
              {[
                'I ate grilled chicken breast, brown rice, and broccoli',
                'Two whole eggs and a slice of whole wheat toast',
                'Protein shake with banana and peanut butter',
                'Salmon fillet with quinoa and asparagus'
              ].map((example, i) => (
                <button
                  key={i}
                  onClick={() => setInput(example)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  disabled={isProcessing}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. Enter what you ate in natural language</li>
              <li>2. I'll parse the foods and estimate portions</li>
              <li>3. Review and adjust portions if needed</li>
              <li>4. Confirm to log - your dashboard updates automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
