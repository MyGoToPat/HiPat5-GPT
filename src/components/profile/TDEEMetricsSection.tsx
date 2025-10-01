import React, { useState, useEffect } from 'react';
import { Activity, Flame, Target, TrendingUp, CreditCard as Edit3, Save, X, User, Calendar, Ruler, Weight, Droplet } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TDEEMetrics {
  // Calculated values
  tdee?: number;
  bmr?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;

  // User input data (stored separately or in user_metrics)
  age?: number;
  gender?: 'male' | 'female';
  height_cm?: number;
  weight_kg?: number;
  body_fat_percent?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'very';
  dietary_preference?: 'carnivore_keto' | 'ketovore' | 'low_carb' | 'balanced_omnivore';
}

const activityLevelLabels = {
  sedentary: 'Sedentary (Little to no exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  very: 'Very Active (6-7 days/week)'
};

const dietaryPreferenceLabels = {
  carnivore_keto: 'Carnivore/Keto',
  ketovore: 'Ketovore',
  low_carb: 'Low Carb',
  balanced_omnivore: 'Balanced Omnivore'
};

export const TDEEMetricsSection: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<TDEEMetrics | null>(null);
  const [editedMetrics, setEditedMetrics] = useState<TDEEMetrics | null>(null);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Load from user_metrics table
      const { data, error } = await supabase
        .from('user_metrics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading metrics:', error);
        toast.error('Failed to load TDEE data');
        return;
      }

      if (data) {
        setMetrics(data);
        setEditedMetrics(data);
      } else {
        // No data yet - user hasn't completed onboarding
        setMetrics(null);
        setEditedMetrics(null);
      }
    } catch (error) {
      console.error('Error loading TDEE metrics:', error);
      toast.error('Failed to load metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editedMetrics) return;

    try {
      setIsSaving(true);
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      const { error } = await supabase
        .from('user_metrics')
        .upsert({
          user_id: user.id,
          tdee: editedMetrics.tdee,
          bmr: editedMetrics.bmr,
          protein_g: editedMetrics.protein_g,
          carbs_g: editedMetrics.carbs_g,
          fat_g: editedMetrics.fat_g,
          age: editedMetrics.age,
          gender: editedMetrics.gender,
          height_cm: editedMetrics.height_cm,
          weight_kg: editedMetrics.weight_kg,
          body_fat_percent: editedMetrics.body_fat_percent,
          activity_level: editedMetrics.activity_level,
          dietary_preference: editedMetrics.dietary_preference,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving metrics:', error);
        toast.error('Failed to save changes');
        return;
      }

      setMetrics(editedMetrics);
      setIsEditing(false);
      toast.success('TDEE metrics updated successfully!');
    } catch (error) {
      console.error('Error saving TDEE metrics:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedMetrics(metrics);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!metrics && !isEditing) {
    return (
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-orange-400" />
            <h3 className="text-lg font-semibold text-white">TDEE & Nutrition Metrics</h3>
          </div>
        </div>

        <div className="bg-blue-900/30 p-6 rounded-lg border border-blue-700 text-center">
          <Target size={48} className="text-blue-400 mx-auto mb-4" />
          <h4 className="text-white font-semibold mb-2">No TDEE Data Found</h4>
          <p className="text-blue-200 text-sm mb-4">
            Complete the TDEE onboarding wizard to set your baseline nutrition targets.
          </p>
          <button
            onClick={() => window.location.href = '/tdee-onboarding'}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Start TDEE Onboarding
          </button>
        </div>
      </div>
    );
  }

  const currentMetrics = isEditing ? editedMetrics : metrics;

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-orange-400" />
          <h3 className="text-lg font-semibold text-white">TDEE & Nutrition Metrics</h3>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <Edit3 size={16} />
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Daily Targets Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={16} className="text-orange-400" />
            <span className="text-orange-200 text-xs font-medium">TDEE</span>
          </div>
          {isEditing ? (
            <input
              type="number"
              value={currentMetrics?.tdee || ''}
              onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, tdee: Number(e.target.value) } : null)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-lg font-bold"
            />
          ) : (
            <div className="text-2xl font-bold text-white">{currentMetrics?.tdee || 0}</div>
          )}
          <div className="text-orange-300 text-xs">calories/day</div>
        </div>

        <div className="bg-gradient-to-br from-red-600/20 to-pink-600/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-red-400" />
            <span className="text-red-200 text-xs font-medium">Protein</span>
          </div>
          {isEditing ? (
            <input
              type="number"
              value={currentMetrics?.protein_g || ''}
              onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, protein_g: Number(e.target.value) } : null)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-lg font-bold"
            />
          ) : (
            <div className="text-2xl font-bold text-white">{currentMetrics?.protein_g || 0}</div>
          )}
          <div className="text-red-300 text-xs">grams/day</div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-blue-400" />
            <span className="text-blue-200 text-xs font-medium">Carbs</span>
          </div>
          {isEditing ? (
            <input
              type="number"
              value={currentMetrics?.carbs_g || ''}
              onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, carbs_g: Number(e.target.value) } : null)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-lg font-bold"
            />
          ) : (
            <div className="text-2xl font-bold text-white">{currentMetrics?.carbs_g || 0}</div>
          )}
          <div className="text-blue-300 text-xs">grams/day</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={16} className="text-yellow-400" />
            <span className="text-yellow-200 text-xs font-medium">Fat</span>
          </div>
          {isEditing ? (
            <input
              type="number"
              value={currentMetrics?.fat_g || ''}
              onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, fat_g: Number(e.target.value) } : null)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-lg font-bold"
            />
          ) : (
            <div className="text-2xl font-bold text-white">{currentMetrics?.fat_g || 0}</div>
          )}
          <div className="text-yellow-300 text-xs">grams/day</div>
        </div>
      </div>

      {/* Personal Metrics */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h4 className="text-white font-semibold mb-4">Personal Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Calendar size={14} className="inline mr-1" />
              Age
            </label>
            {isEditing ? (
              <input
                type="number"
                value={currentMetrics?.age || ''}
                onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, age: Number(e.target.value) } : null)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                placeholder="Enter age"
              />
            ) : (
              <div className="px-3 py-2 bg-gray-900 rounded text-white">
                {currentMetrics?.age ? `${currentMetrics.age} years` : 'Not set'}
              </div>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <User size={14} className="inline mr-1" />
              Gender
            </label>
            {isEditing ? (
              <select
                value={currentMetrics?.gender || ''}
                onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, gender: e.target.value as any } : null)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            ) : (
              <div className="px-3 py-2 bg-gray-900 rounded text-white capitalize">
                {currentMetrics?.gender || 'Not set'}
              </div>
            )}
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Ruler size={14} className="inline mr-1" />
              Height
            </label>
            {isEditing ? (
              <input
                type="number"
                value={currentMetrics?.height_cm || ''}
                onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, height_cm: Number(e.target.value) } : null)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                placeholder="Height in cm"
              />
            ) : (
              <div className="px-3 py-2 bg-gray-900 rounded text-white">
                {currentMetrics?.height_cm ? `${currentMetrics.height_cm} cm` : 'Not set'}
              </div>
            )}
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Weight size={14} className="inline mr-1" />
              Weight
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={currentMetrics?.weight_kg || ''}
                onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, weight_kg: Number(e.target.value) } : null)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                placeholder="Weight in kg"
              />
            ) : (
              <div className="px-3 py-2 bg-gray-900 rounded text-white">
                {currentMetrics?.weight_kg ? `${currentMetrics.weight_kg} kg` : 'Not set'}
              </div>
            )}
          </div>

          {/* Body Fat % */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Droplet size={14} className="inline mr-1" />
              Body Fat %
            </label>
            {isEditing ? (
              <input
                type="number"
                step="0.1"
                value={currentMetrics?.body_fat_percent || ''}
                onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, body_fat_percent: Number(e.target.value) } : null)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                placeholder="Body fat %"
              />
            ) : (
              <div className="px-3 py-2 bg-gray-900 rounded text-white">
                {currentMetrics?.body_fat_percent ? `${currentMetrics.body_fat_percent}%` : 'Not set'}
              </div>
            )}
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Activity size={14} className="inline mr-1" />
              Activity Level
            </label>
            {isEditing ? (
              <select
                value={currentMetrics?.activity_level || ''}
                onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, activity_level: e.target.value as any } : null)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
              >
                <option value="">Select activity level</option>
                {Object.entries(activityLevelLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 bg-gray-900 rounded text-white">
                {currentMetrics?.activity_level
                  ? activityLevelLabels[currentMetrics.activity_level as keyof typeof activityLevelLabels]
                  : 'Not set'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dietary Preference */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-semibold mb-4">Dietary Preference</h4>
        <div>
          {isEditing ? (
            <select
              value={currentMetrics?.dietary_preference || ''}
              onChange={(e) => setEditedMetrics(prev => prev ? { ...prev, dietary_preference: e.target.value as any } : null)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white"
            >
              <option value="">Select dietary preference</option>
              {Object.entries(dietaryPreferenceLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-gray-900 rounded text-white">
              {currentMetrics?.dietary_preference
                ? dietaryPreferenceLabels[currentMetrics.dietary_preference as keyof typeof dietaryPreferenceLabels]
                : 'Not set'}
            </div>
          )}
        </div>
      </div>

      {/* BMR Info */}
      {currentMetrics?.bmr && (
        <div className="mt-6 bg-blue-900/30 p-4 rounded-lg border border-blue-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-blue-400" />
            <span className="text-blue-200 text-sm font-medium">Basal Metabolic Rate (BMR)</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{currentMetrics.bmr} cal/day</div>
          <p className="text-blue-200 text-xs">
            This is the number of calories your body burns at rest. Your TDEE includes activity multiplier.
          </p>
        </div>
      )}
    </div>
  );
};
