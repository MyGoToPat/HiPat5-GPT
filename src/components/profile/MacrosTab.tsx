import React, { useState, useEffect } from 'react';
import { Activity, Flame, Target, TrendingUp, Zap, Minus, Plus } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TDEEMetrics {
  tdee?: number;
  bmr?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  age?: number;
  gender?: 'male' | 'female';
  height_cm?: number;
  weight_kg?: number;
  body_fat_percent?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'very';
  dietary_preference?: 'carnivore_keto' | 'ketovore' | 'low_carb' | 'balanced_omnivore';
}

interface UnitPreferences {
  weight_unit?: 'lbs' | 'kg';
  height_unit?: 'feet' | 'cm';
}

type CaloricGoal = 'deficit' | 'maintenance' | 'surplus';

const activityLevelLabels = {
  sedentary: 'Sedentary (Little to no exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  very: 'Very Active (6-7 days/week)'
};

const dietaryPreferenceLabels = {
  carnivore_keto: 'Carnivore/Keto (70-80% fat)',
  ketovore: 'Ketovore (60-70% fat)',
  low_carb: 'Low Carb (30-40% fat)',
  balanced_omnivore: 'Balanced Omnivore (25-30% fat)'
};

export const MacrosTab: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<TDEEMetrics | null>(null);
  const [unitPrefs, setUnitPrefs] = useState<UnitPreferences>({ weight_unit: 'lbs', height_unit: 'feet' });
  const [caloricGoal, setCaloricGoal] = useState<CaloricGoal>('maintenance');
  const [customDeficit, setCustomDeficit] = useState(500);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const [metricsResult, prefsResult] = await Promise.all([
        supabase.from('user_metrics').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_preferences').select('weight_unit, height_unit').eq('user_id', user.id).maybeSingle()
      ]);

      if (metricsResult.data) {
        setMetrics(metricsResult.data);
      }

      if (prefsResult.data) {
        setUnitPrefs(prefsResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatWeight = (kg: number | undefined) => {
    if (!kg) return 'N/A';
    if (unitPrefs.weight_unit === 'lbs') {
      return `${(kg * 2.20462).toFixed(1)} lbs`;
    }
    return `${kg.toFixed(1)} kg`;
  };

  const formatHeight = (cm: number | undefined) => {
    if (!cm) return 'N/A';
    if (unitPrefs.height_unit === 'feet') {
      const totalInches = cm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}'${inches}"`;
    }
    return `${cm.toFixed(1)} cm`;
  };

  const calculateTEF = (tdee: number | undefined, dietPref: string | undefined) => {
    if (!tdee) return 0;
    const tefMap = {
      carnivore_keto: 0.15,
      ketovore: 0.12,
      low_carb: 0.10,
      balanced_omnivore: 0.10
    };
    return Math.round(tdee * (tefMap[dietPref as keyof typeof tefMap] || 0.10));
  };

  const getAdjustedCalories = () => {
    if (!metrics?.tdee) return 0;

    switch (caloricGoal) {
      case 'deficit':
        return metrics.tdee - customDeficit;
      case 'surplus':
        return metrics.tdee + customDeficit;
      default:
        return metrics.tdee;
    }
  };

  const getAdjustedMacros = () => {
    if (!metrics?.protein_g || !metrics?.carbs_g || !metrics?.fat_g || !metrics?.tdee) {
      return { protein: 0, carbs: 0, fat: 0 };
    }

    const adjustedCals = getAdjustedCalories();
    const ratio = adjustedCals / metrics.tdee;

    return {
      protein: Math.round(metrics.protein_g * ratio),
      carbs: Math.round(metrics.carbs_g * ratio),
      fat: Math.round(metrics.fat_g * ratio)
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
        <Flame className="mx-auto mb-4 text-gray-600" size={48} />
        <h3 className="text-xl font-semibold text-white mb-2">No TDEE Data</h3>
        <p className="text-gray-400 mb-4">Complete the onboarding wizard to calculate your personalized macros</p>
        <button className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
          Start Onboarding
        </button>
      </div>
    );
  }

  const tef = calculateTEF(metrics.tdee, metrics.dietary_preference);
  const netCalories = (metrics.tdee || 0) - tef;
  const adjustedCals = getAdjustedCalories();
  const adjustedMacros = getAdjustedMacros();

  return (
    <div className="space-y-6">
      {/* Caloric Goal Selector */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Target size={20} className="text-orange-500" />
          Caloric Goal
        </h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => setCaloricGoal('deficit')}
            className={`p-4 rounded-lg border-2 transition-all ${
              caloricGoal === 'deficit'
                ? 'bg-red-600/20 border-red-500 text-red-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Minus size={20} className="mx-auto mb-1" />
            <div className="font-semibold text-sm">Deficit</div>
            <div className="text-xs opacity-75">Lose Weight</div>
          </button>
          <button
            onClick={() => setCaloricGoal('maintenance')}
            className={`p-4 rounded-lg border-2 transition-all ${
              caloricGoal === 'maintenance'
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Activity size={20} className="mx-auto mb-1" />
            <div className="font-semibold text-sm">Maintenance</div>
            <div className="text-xs opacity-75">Maintain Weight</div>
          </button>
          <button
            onClick={() => setCaloricGoal('surplus')}
            className={`p-4 rounded-lg border-2 transition-all ${
              caloricGoal === 'surplus'
                ? 'bg-green-600/20 border-green-500 text-green-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            <Plus size={20} className="mx-auto mb-1" />
            <div className="font-semibold text-sm">Surplus</div>
            <div className="text-xs opacity-75">Gain Weight</div>
          </button>
        </div>

        {caloricGoal !== 'maintenance' && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <label className="block text-sm text-gray-300 mb-2">
              {caloricGoal === 'deficit' ? 'Deficit' : 'Surplus'} Amount (calories/day)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={customDeficit}
                onChange={(e) => setCustomDeficit(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-white font-semibold w-24 text-right">{customDeficit} cal</span>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Recommended: 300-500 cal for sustainable results
            </div>
          </div>
        )}
      </div>

      {/* TDEE Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-xl p-6 border border-orange-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={20} className="text-orange-400" />
            <span className="text-sm text-orange-200">TDEE</span>
          </div>
          <div className="text-3xl font-bold text-white">{metrics.tdee || 0}</div>
          <div className="text-xs text-orange-200 mt-1">cal/day</div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-6 border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={20} className="text-blue-400" />
            <span className="text-sm text-blue-200">BMR</span>
          </div>
          <div className="text-3xl font-bold text-white">{metrics.bmr || 0}</div>
          <div className="text-xs text-blue-200 mt-1">cal/day</div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={20} className="text-purple-400" />
            <span className="text-sm text-purple-200">TEF</span>
          </div>
          <div className="text-3xl font-bold text-white">{tef}</div>
          <div className="text-xs text-purple-200 mt-1">cal burned digesting</div>
        </div>
      </div>

      {/* Target Calories */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Target Calories</h3>
        <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-lg p-6 border border-orange-500/30">
          <div className="text-center">
            <div className="text-5xl font-bold text-white mb-2">{adjustedCals}</div>
            <div className="text-orange-200">calories per day</div>
            {caloricGoal !== 'maintenance' && (
              <div className="mt-2 text-sm text-gray-300">
                ({caloricGoal === 'deficit' ? '-' : '+'}{customDeficit} from TDEE)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Macro Targets */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Macro Targets</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-600/10 rounded-lg p-4 border border-red-500/30">
            <div className="text-red-300 text-sm mb-1">Protein</div>
            <div className="text-2xl font-bold text-white">{adjustedMacros.protein}g</div>
            <div className="text-xs text-red-200 mt-1">{adjustedMacros.protein * 4} cal</div>
          </div>
          <div className="bg-blue-600/10 rounded-lg p-4 border border-blue-500/30">
            <div className="text-blue-300 text-sm mb-1">Carbs</div>
            <div className="text-2xl font-bold text-white">{adjustedMacros.carbs}g</div>
            <div className="text-xs text-blue-200 mt-1">{adjustedMacros.carbs * 4} cal</div>
          </div>
          <div className="bg-yellow-600/10 rounded-lg p-4 border border-yellow-500/30">
            <div className="text-yellow-300 text-sm mb-1">Fat</div>
            <div className="text-2xl font-bold text-white">{adjustedMacros.fat}g</div>
            <div className="text-xs text-yellow-200 mt-1">{adjustedMacros.fat * 9} cal</div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Gender</div>
            <div className="text-white font-medium">{metrics.gender ? metrics.gender.charAt(0).toUpperCase() + metrics.gender.slice(1) : 'Not set'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Age</div>
            <div className="text-white font-medium">{metrics.age || 'Not set'} years</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Height</div>
            <div className="text-white font-medium">{formatHeight(metrics.height_cm)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Weight</div>
            <div className="text-white font-medium">{formatWeight(metrics.weight_kg)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Body Fat %</div>
            <div className="text-white font-medium">{metrics.body_fat_percent || 'Not set'}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Activity Level</div>
            <div className="text-white font-medium text-sm">
              {metrics.activity_level ? activityLevelLabels[metrics.activity_level] : 'Not set'}
            </div>
          </div>
        </div>
      </div>

      {/* Dietary Preference */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Dietary Preference</h3>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-white font-medium">
            {metrics.dietary_preference ? dietaryPreferenceLabels[metrics.dietary_preference] : 'Not set'}
          </div>
        </div>
      </div>
    </div>
  );
};
