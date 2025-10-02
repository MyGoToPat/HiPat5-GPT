import React, { useState, useEffect } from 'react';
import { Activity, Flame, Target, TrendingUp, Zap, Minus, Plus, CreditCard as Edit2, Scale } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { WeightLogModal } from './WeightLogModal';
import { WeightTrendGraph } from './WeightTrendGraph';

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
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightLogs, setWeightLogs] = useState<any[]>([]);
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
    fat_g: 0
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

      const [metricsResult, prefsResult, weightLogsResult] = await Promise.all([
        supabase.from('user_metrics').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_preferences').select('weight_unit, height_unit').eq('user_id', user.id).maybeSingle(),
        supabase.from('weight_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: false }).limit(30)
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
          fat_g: metricsResult.data.fat_g || 0
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
      }

      if (weightLogsResult.data) {
        setWeightLogs(weightLogsResult.data);
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

      const { error } = await supabase
        .from('user_metrics')
        .update({
          protein_g: editMacros.protein_g,
          carbs_g: editMacros.carbs_g,
          fat_g: editMacros.fat_g
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Macros updated successfully!');
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

      const { error } = await supabase
        .from('user_metrics')
        .update({
          caloric_goal: caloricGoal,
          caloric_adjustment: customDeficit
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Caloric goal saved!');
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

  const adjustedMacros = getAdjustedMacros();
  const tef = calculateTEF(adjustedMacros.protein, adjustedMacros.carbs, adjustedMacros.fat);
  const adjustedCals = getAdjustedCalories();
  const netCalories = adjustedCals - tef;
  const totalDeficit = caloricGoal === 'maintenance' ? tef : customDeficit + tef;

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
        <h3 className="text-lg font-semibold text-white mb-4">Target Calories</h3>

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

            {caloricGoal !== 'maintenance' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">
                  {caloricGoal === 'deficit' ? 'Deficit' : 'Surplus'} Amount
                </span>
                <span className={`font-medium ${caloricGoal === 'deficit' ? 'text-red-400' : 'text-green-400'}`}>
                  {caloricGoal === 'deficit' ? '-' : '+'}{customDeficit} cal
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Target (Before TEF)</span>
              <span className="text-blue-300 font-medium">
                {caloricGoal === 'maintenance' ? metrics.tdee :
                  caloricGoal === 'deficit' ? (metrics.tdee || 0) - customDeficit :
                  (metrics.tdee || 0) + customDeficit} cal
              </span>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
              <span className="text-gray-400 flex items-center gap-2">
                <Zap size={14} className="text-purple-400" />
                TEF (Thermic Effect)
              </span>
              <span className="text-purple-300 font-medium">-{tef} cal</span>
            </div>

            {caloricGoal !== 'maintenance' && (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
                <span className="text-gray-300 font-semibold">Total Deficit/Surplus</span>
                <span className={`font-bold ${caloricGoal === 'deficit' ? 'text-red-400' : 'text-green-400'}`}>
                  {caloricGoal === 'deficit' ? '-' : '+'}{totalDeficit} cal
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-700">
              <span className="text-gray-300 font-semibold">Net Daily Target</span>
              <span className="text-orange-400 font-bold text-lg">{netCalories} cal</span>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            TEF calculated: Protein (30%), Carbs (12%), Fat (2%) of macro calories
          </div>
        </div>
      </div>

      {/* Daily Macro Targets */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Daily Macro Targets</h3>
          {!isEditingMacros ? (
            <button
              onClick={() => {
                setEditMacros({
                  protein_g: adjustedMacros.protein,
                  carbs_g: adjustedMacros.carbs,
                  fat_g: adjustedMacros.fat
                });
                setIsEditingMacros(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              <Edit2 size={16} />
              Edit
            </button>
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
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Scale size={20} className="text-blue-400" />
            Weight Tracking
          </h3>
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
          useMetric={unitPrefs.weight_unit === 'kg'}
          days={30}
        />
      </div>

      {/* Personal Information */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Personal Information</h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
            >
              <Edit2 size={16} />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          )}
        </div>
        {!isEditing ? (
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
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Weight ({unitPrefs.weight_unit})</label>
              <input
                type="number"
                step="0.1"
                value={unitPrefs.weight_unit === 'kg' ? editForm.weight_kg : editForm.weight_kg * 2.20462}
                onChange={(e) => setEditForm({
                  ...editForm,
                  weight_kg: unitPrefs.weight_unit === 'kg' ? parseFloat(e.target.value) : parseFloat(e.target.value) / 2.20462
                })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Body Fat %</label>
              <input
                type="number"
                step="0.1"
                value={editForm.body_fat_percent}
                onChange={(e) => setEditForm({ ...editForm, body_fat_percent: parseFloat(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Activity Level</label>
              <select
                value={editForm.activity_level}
                onChange={(e) => setEditForm({ ...editForm, activity_level: e.target.value as any })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                {Object.entries(activityLevelLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Dietary Preference</label>
              <select
                value={editForm.dietary_preference}
                onChange={(e) => setEditForm({ ...editForm, dietary_preference: e.target.value as any })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                {Object.entries(dietaryPreferenceLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
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
    </div>
  );
};
