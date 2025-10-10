import React, { useState, useEffect } from 'react';
import { Activity, Flame, Target, TrendingUp, Zap, Minus, Plus, CreditCard as Edit2, Scale, CheckCircle, X, AlertCircle } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { WeightLogModal } from './WeightLogModal';
import { WeightTrendGraph } from './WeightTrendGraph';
import { BodyFatLogModal } from './BodyFatLogModal';
import { BodyFatTrendGraph } from './BodyFatTrendGraph';

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
  manual_macro_override?: boolean;
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
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
  const [showBodyFatModal, setShowBodyFatModal] = useState(false);
  const [bodyFatLogs, setBodyFatLogs] = useState<any[]>([]);
  const [weightDisplayUnit, setWeightDisplayUnit] = useState<'lbs' | 'kg'>('lbs'); // Will be set from preferences
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingMacros, setIsEditingMacros] = useState(false);
  const [editForm, setEditForm] = useState({
    weight_kg: 0,
    body_fat_percent: 0,
    activity_level: 'moderate' as const,
    dietary_preference: 'balanced_omnivore' as const
  });
  const [editMacros, setEditMacros] = useState({
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g_target: 0  // NEW: Optional fiber target
  });

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

      const [metricsResult, prefsResult, weightLogsResult, bodyFatLogsResult] = await Promise.all([
        supabase.from('user_metrics').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_preferences').select('weight_unit, height_unit').eq('user_id', user.id).maybeSingle(),
        supabase.from('weight_logs').select('weight_kg, weight_lbs, log_date, logged_unit, note, id, created_at').eq('user_id', user.id).order('log_date', { ascending: false }).limit(30),
        supabase.from('body_fat_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: false }).limit(30)
      ]);

      if (metricsResult.data) {
        setMetrics(metricsResult.data);
        setEditForm({
          weight_kg: metricsResult.data.weight_kg || 0,
          body_fat_percent: metricsResult.data.body_fat_percent || 0,
          activity_level: metricsResult.data.activity_level || 'moderate',
          dietary_preference: metricsResult.data.dietary_preference || 'balanced_omnivore'
        });
        setEditMacros({
          protein_g: metricsResult.data.protein_g || 0,
          carbs_g: metricsResult.data.carbs_g || 0,
          fat_g: metricsResult.data.fat_g || 0,
          fiber_g_target: metricsResult.data.fiber_g_target || 0
        });
        if (metricsResult.data.caloric_goal) {
          setCaloricGoal(metricsResult.data.caloric_goal as CaloricGoal);
        }
        if (metricsResult.data.caloric_adjustment) {
          setCustomDeficit(metricsResult.data.caloric_adjustment);
        }
      }

      if (prefsResult.data) {
        setUnitPrefs(prefsResult.data);
        // Set weight display unit from preferences
        if (prefsResult.data.weight_unit) {
          setWeightDisplayUnit(prefsResult.data.weight_unit);
        }
      }

      if (weightLogsResult.data) {
        setWeightLogs(weightLogsResult.data);
      }

      if (bodyFatLogsResult.data) {
        setBodyFatLogs(bodyFatLogsResult.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_metrics')
        .update({
          weight_kg: editForm.weight_kg,
          body_fat_percent: editForm.body_fat_percent,
          activity_level: editForm.activity_level,
          dietary_preference: editForm.dietary_preference
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      loadData();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleSaveMacros = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const totalCals = (editMacros.protein_g * 4) + (editMacros.carbs_g * 4) + (editMacros.fat_g * 9);

      // Update user_metrics (source of truth)
      // Set manual_macro_override = TRUE to indicate manual edit
      const { error: metricsError } = await supabase
        .from('user_metrics')
        .update({
          protein_g: editMacros.protein_g,
          carbs_g: editMacros.carbs_g,
          fat_g: editMacros.fat_g,
          fiber_g_target: editMacros.fiber_g_target || null,
          manual_macro_override: true,  // FLAG: User manually set macros
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (metricsError) throw metricsError;

      // Also sync to profiles table for compatibility
      const { error: profilesError } = await supabase
        .from('profiles')
        .update({
          protein_g_override: editMacros.protein_g,
          carb_g_override: editMacros.carbs_g,
          fat_g_override: editMacros.fat_g,
          last_macro_update: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profilesError) console.warn('Profile sync warning:', profilesError);

      toast.success('Macros updated successfully! Calorie targets will now be calculated from your custom macros.');
      setIsEditingMacros(false);
      loadData();
    } catch (error: any) {
      console.error('Error updating macros:', error);
      toast.error('Failed to update macros');
    }
  };

  const handleSaveCaloricGoal = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Reset manual override when user adjusts caloric goal slider
      // This returns to automatic macro calculation
      const { error } = await supabase
        .from('user_metrics')
        .update({
          caloric_goal: caloricGoal,
          caloric_adjustment: customDeficit,
          manual_macro_override: false  // Reset to automatic mode
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Caloric goal saved! Macros will be automatically calculated.');
      loadData();  // Reload to recalculate macros
    } catch (error: any) {
      console.error('Error saving caloric goal:', error);
      toast.error('Failed to save caloric goal');
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

  // Handler to update unit preferences in database
  const handleUnitChange = async (newWeightUnit: 'lbs' | 'kg') => {
    try {
      setWeightDisplayUnit(newWeightUnit);

      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Determine height unit based on weight unit (unified system)
      const newHeightUnit = newWeightUnit === 'lbs' ? 'feet' : 'cm';
      const newUnitSystem = newWeightUnit === 'lbs' ? 'imperial' : 'metric';

      // Save to database
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          weight_unit: newWeightUnit,
          height_unit: newHeightUnit,
          unit_system: newUnitSystem,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Update local state
      setUnitPrefs({
        weight_unit: newWeightUnit,
        height_unit: newHeightUnit
      });

      toast.success(`Units changed to ${newUnitSystem === 'imperial' ? 'Imperial (lbs/ft)' : 'Metric (kg/cm)'}`);
    } catch (error: any) {
      console.error('Error saving unit preference:', error);
      toast.error('Failed to save unit preference');
    }
  };

  const calculateTEF = (protein_g: number | undefined, carbs_g: number | undefined, fat_g: number | undefined) => {
    if (!protein_g || !carbs_g || !fat_g) return 0;
    const proteinTEF = (protein_g * 4) * 0.30;
    const carbsTEF = (carbs_g * 4) * 0.12;
    const fatTEF = (fat_g * 9) * 0.02;
    return Math.round(proteinTEF + carbsTEF + fatTEF);
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

  // CRITICAL: Use BASE macros from metrics (user's manual edits take priority)
  const displayProtein = isEditingMacros ? editMacros.protein_g : (metrics?.protein_g || 0);
  const displayCarbs = isEditingMacros ? editMacros.carbs_g : (metrics?.carbs_g || 0);
  const displayFat = isEditingMacros ? editMacros.fat_g : (metrics?.fat_g || 0);

  const tef = calculateTEF(displayProtein, displayCarbs, displayFat);

  // BIDIRECTIONAL CALCULATION:
  // If manual_macro_override = TRUE: Calculate target FROM macros
  // If manual_macro_override = FALSE: Calculate macros FROM target (slider)
  const isManualOverride = metrics?.manual_macro_override === true;

  let targetBeforeTEF: number;
  let netCalories: number;
  let totalDeficit: number;

  if (isManualOverride) {
    // MACROS → CALORIES: User set macros manually, derive target from them
    const macroCalories = (displayProtein * 4) + (displayCarbs * 4) + (displayFat * 9);
    targetBeforeTEF = macroCalories;
    netCalories = macroCalories - tef;
    // Calculate what the deficit/surplus would be compared to TDEE
    const tdee = metrics.tdee || 0;
    totalDeficit = tdee - macroCalories + tef;  // Positive = deficit, Negative = surplus
  } else {
    // CALORIES → MACROS: Traditional slider-based calculation
    targetBeforeTEF = caloricGoal === 'maintenance'
      ? (metrics.tdee || 0)
      : caloricGoal === 'deficit'
        ? (metrics.tdee || 0) - customDeficit
        : (metrics.tdee || 0) + customDeficit;
    netCalories = targetBeforeTEF - tef;
    totalDeficit = caloricGoal === 'maintenance' ? tef : customDeficit + tef;
  }

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

        <button
          onClick={handleSaveCaloricGoal}
          className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Save Caloric Goal
        </button>
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Target Calories</h3>
          {isManualOverride && (
            <span className="text-xs text-blue-300 bg-blue-600/10 px-3 py-1 rounded-full border border-blue-500/30">
              Calculated from Manual Macros
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 rounded-lg p-6 border border-orange-500/30">
            <div className="text-center">
              <div className="text-sm text-orange-300 mb-1">Daily Target (After TEF)</div>
              <div className="text-5xl font-bold text-white mb-2">{netCalories}</div>
              <div className="text-orange-200">calories per day</div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">TDEE (Base)</span>
              <span className="text-white font-medium">{metrics.tdee || 0} cal</span>
            </div>

            {!isManualOverride && caloricGoal !== 'maintenance' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {caloricGoal === 'deficit' ? 'Deficit' : 'Surplus'} Amount
                </span>
                <span className={`font-medium ${caloricGoal === 'deficit' ? 'text-red-400' : 'text-green-400'}`}>
                  {caloricGoal === 'deficit' ? '-' : '+'}{customDeficit} cal
                </span>
              </div>
            )}

            {isManualOverride && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Deficit Amount</span>
                <span className={`font-medium ${totalDeficit > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {totalDeficit > 0 ? '-' : '+'}{Math.abs(Math.round(totalDeficit))} cal
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">
                {isManualOverride ? 'Target from Macros' : 'Target (Before TEF)'}
              </span>
              <span className="text-blue-300 font-medium">{Math.round(targetBeforeTEF)} cal</span>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
              <span className="text-gray-400 flex items-center gap-2">
                <Zap size={14} className="text-purple-400" />
                TEF (Thermic Effect)
              </span>
              <span className="text-purple-300 font-medium">-{tef} cal</span>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
              <span className="text-gray-300 font-semibold">Net Daily Target</span>
              <span className="text-orange-400 font-bold text-lg">{Math.round(netCalories)} cal</span>
            </div>

            {!isManualOverride && caloricGoal !== 'maintenance' && (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
                <span className="text-gray-300 font-semibold">Total Deficit/Surplus</span>
                <span className={`font-bold ${caloricGoal === 'deficit' ? 'text-red-400' : 'text-green-400'}`}>
                  {caloricGoal === 'deficit' ? '-' : '+'}{Math.round(totalDeficit)} cal
                </span>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center">
            {isManualOverride
              ? 'Target calculated from your manual macros • Protein (4 cal/g), Carbs (4 cal/g), Fat (9 cal/g)'
              : 'TEF calculated: Protein (30%), Carbs (12%), Fat (2%) of macro calories'
            }
          </div>
        </div>
      </div>

      {/* Daily Macro Targets */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Daily Macro Targets</h3>
            {isManualOverride && !isEditingMacros && (
              <span className="px-2 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-xs text-blue-300">
                Manual Mode
              </span>
            )}
          </div>
          {!isEditingMacros ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Edit BASE macros, not adjusted ones
                  setEditMacros({
                    protein_g: metrics?.protein_g || 0,
                    carbs_g: metrics?.carbs_g || 0,
                    fat_g: metrics?.fat_g || 0,
                    fiber_g_target: metrics?.fiber_g_target || 0
                  });
                  setIsEditingMacros(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
              >
                <Edit2 size={16} />
                Edit
              </button>
              {isManualOverride && (
                <button
                  onClick={async () => {
                    try {
                      const supabase = getSupabase();
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;

                      const { error } = await supabase
                        .from('user_metrics')
                        .update({ manual_macro_override: false })
                        .eq('user_id', user.id);

                      if (error) throw error;

                      toast.success('Switched to automatic macro calculation');
                      loadData();
                    } catch (error) {
                      console.error('Error resetting override:', error);
                      toast.error('Failed to reset');
                    }
                  }}
                  className="px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/50 text-orange-300 text-sm rounded-lg transition-colors"
                >
                  Reset to Auto
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingMacros(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMacros}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>

        {!isEditingMacros ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-600/10 rounded-lg p-4 border border-red-500/30">
                <div className="text-red-300 text-sm mb-1">Protein</div>
                <div className="text-2xl font-bold text-white">{displayProtein}g</div>
                <div className="text-xs text-red-200 mt-1">{Math.round(displayProtein * 4)} cal</div>
              </div>
              <div className="bg-blue-600/10 rounded-lg p-4 border border-blue-500/30">
                <div className="text-blue-300 text-sm mb-1">Carbs</div>
                <div className="text-2xl font-bold text-white">{displayCarbs}g</div>
                <div className="text-xs text-blue-200 mt-1">{Math.round(displayCarbs * 4)} cal</div>
              </div>
              <div className="bg-yellow-600/10 rounded-lg p-4 border border-yellow-500/30">
                <div className="text-yellow-300 text-sm mb-1">Fat</div>
                <div className="text-2xl font-bold text-white">{displayFat}g</div>
                <div className="text-xs text-yellow-200 mt-1">{Math.round(displayFat * 9)} cal</div>
              </div>
            </div>

            {/* Fiber Target Display */}
            {metrics?.fiber_g_target && metrics.fiber_g_target > 0 && (
              <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-green-300 text-sm mb-1">Daily Fiber Target</div>
                    <div className="text-2xl font-bold text-white">{metrics.fiber_g_target}g</div>
                    <div className="text-xs text-green-200 mt-1">USDA recommends 25-35g per day</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-red-300 mb-2">Protein (g)</label>
                <input
                  type="number"
                  step="1"
                  value={editMacros.protein_g}
                  onChange={(e) => setEditMacros({ ...editMacros, protein_g: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
                <div className="text-xs text-red-200 mt-1">{Math.round(editMacros.protein_g * 4)} cal</div>
              </div>
              <div>
                <label className="block text-sm text-blue-300 mb-2">Carbs (g)</label>
                <input
                  type="number"
                  step="1"
                  value={editMacros.carbs_g}
                  onChange={(e) => setEditMacros({ ...editMacros, carbs_g: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
                <div className="text-xs text-blue-200 mt-1">{Math.round(editMacros.carbs_g * 4)} cal</div>
              </div>
              <div>
                <label className="block text-sm text-yellow-300 mb-2">Fat (g)</label>
                <input
                  type="number"
                  step="1"
                  value={editMacros.fat_g}
                  onChange={(e) => setEditMacros({ ...editMacros, fat_g: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
                <div className="text-xs text-yellow-200 mt-1">{Math.round(editMacros.fat_g * 9)} cal</div>
              </div>
            </div>

            {/* NEW: Fiber Target Input */}
            <div className="bg-green-600/10 rounded-lg p-4 border border-green-500/30">
              <label className="block text-sm text-green-300 mb-2">Daily Fiber Target (g) - Optional</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="25-35g recommended"
                value={editMacros.fiber_g_target || ''}
                onChange={(e) => setEditMacros({ ...editMacros, fiber_g_target: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
              <div className="text-xs text-green-200 mt-1">USDA recommends 25-35g per day. Leave empty for no target.</div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Total Calories from Macros</span>
                <span className="text-white font-bold">
                  {Math.round((editMacros.protein_g * 4) + (editMacros.carbs_g * 4) + (editMacros.fat_g * 9))} cal
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Estimated TEF</span>
                <span className="text-purple-400">
                  -{Math.round(((editMacros.protein_g * 4) * 0.30) + ((editMacros.carbs_g * 4) * 0.12) + ((editMacros.fat_g * 9) * 0.02))} cal
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
                <span className="text-gray-300 font-semibold">Net Calories</span>
                <span className="text-orange-400 font-bold">
                  {Math.round((editMacros.protein_g * 4) + (editMacros.carbs_g * 4) + (editMacros.fat_g * 9) -
                    (((editMacros.protein_g * 4) * 0.30) + ((editMacros.carbs_g * 4) * 0.12) + ((editMacros.fat_g * 9) * 0.02)))} cal
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Target: {netCalories} cal (net after TEF)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weight Tracking Section */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Scale size={20} className="text-blue-400" />
              Weight Tracking
            </h3>
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => handleUnitChange('lbs')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  weightDisplayUnit === 'lbs'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                lbs
              </button>
              <button
                onClick={() => handleUnitChange('kg')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  weightDisplayUnit === 'kg'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                kg
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowWeightModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Log Weight
          </button>
        </div>
        <WeightTrendGraph
          logs={weightLogs}
          goalWeightKg={metrics?.goal_weight_kg}
          useMetric={weightDisplayUnit === 'kg'}
          days={30}
        />
      </div>

      {/* Body Fat Tracking Section */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity size={20} className="text-orange-400" />
            Body Fat Tracking
          </h3>
          <button
            onClick={() => setShowBodyFatModal(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
          >
            Log Body Fat
          </button>
        </div>
        <BodyFatTrendGraph
          logs={bodyFatLogs}
          goalBodyFat={metrics?.goal_body_fat_percent}
          days={30}
        />
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

      <WeightLogModal
        isOpen={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        onWeightLogged={() => {
          loadData();
          setShowWeightModal(false);
        }}
        currentWeightKg={metrics?.weight_kg}
        useMetric={unitPrefs.weight_unit === 'kg'}
      />
      <BodyFatLogModal
        isOpen={showBodyFatModal}
        onClose={() => setShowBodyFatModal(false)}
        onBodyFatLogged={() => {
          loadData();
          setShowBodyFatModal(false);
        }}
        currentBodyFat={metrics?.body_fat_percent}
      />
    </div>
  );
};
