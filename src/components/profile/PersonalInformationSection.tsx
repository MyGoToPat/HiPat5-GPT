import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Clock, CreditCard as Edit2, CheckCircle, AlertCircle } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TDEEMetrics {
  gender?: 'male' | 'female';
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  body_fat_percent?: number;
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  tdee_calories?: number;
  last_tdee_update?: string;
  dietary_preference?: 'balanced_omnivore' | 'high_protein' | 'low_carb' | 'vegetarian' | 'vegan' | 'paleo' | 'keto';
}

interface UnitPreferences {
  weight_unit: 'lbs' | 'kg';
  height_unit: 'feet' | 'cm';
}

interface PersonalInformationSectionProps {
  userProfile: {
    name: string;
    email: string;
    phone: string;
    location: string;
    dateOfBirth: string;
    bio: string;
  } | null;
  dbProfile: {
    beta_user: boolean;
  } | null;
  onProfileUpdate: (profile: any) => void;
}

const activityLevelLabels = {
  sedentary: 'Sedentary (Little/no exercise)',
  light: 'Light (1-3 days/week)',
  moderate: 'Moderate (3-5 days/week)',
  active: 'Active (6-7 days/week)',
  very_active: 'Very Active (Physical job + training)'
};

const dietaryPreferenceLabels = {
  balanced_omnivore: 'Balanced Omnivore',
  high_protein: 'High Protein',
  low_carb: 'Low Carb (30-40% fat)',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  paleo: 'Paleo',
  keto: 'Ketogenic'
};

export const PersonalInformationSection: React.FC<PersonalInformationSectionProps> = ({
  userProfile,
  dbProfile,
  onProfileUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState(userProfile);
  const [timezone, setTimezone] = useState('America/New_York');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [metrics, setMetrics] = useState<TDEEMetrics>({});
  const [unitPrefs, setUnitPrefs] = useState<UnitPreferences>({ weight_unit: 'lbs', height_unit: 'feet' });
  const [editForm, setEditForm] = useState({
    weight_kg: 0,
    body_fat_percent: 0,
    activity_level: 'moderate' as const,
    dietary_preference: 'balanced_omnivore' as const
  });

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load all data
  useEffect(() => {
    loadData();
  }, []);

  // Sync editedProfile when userProfile changes
  useEffect(() => {
    setEditedProfile(userProfile);
  }, [userProfile]);

  const loadData = async () => {
    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [metricsResult, prefsResult] = await Promise.all([
        supabase.from('user_metrics').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_preferences').select('weight_unit, height_unit, timezone').eq('user_id', user.id).maybeSingle()
      ]);

      if (metricsResult.data) {
        setMetrics(metricsResult.data);
        setEditForm({
          weight_kg: metricsResult.data.weight_kg || 0,
          body_fat_percent: metricsResult.data.body_fat_percent || 0,
          activity_level: metricsResult.data.activity_level || 'moderate',
          dietary_preference: metricsResult.data.dietary_preference || 'balanced_omnivore'
        });
      }

      if (prefsResult.data) {
        setUnitPrefs({
          weight_unit: prefsResult.data.weight_unit || 'lbs',
          height_unit: prefsResult.data.height_unit || 'feet'
        });
        if (prefsResult.data.timezone) {
          setTimezone(prefsResult.data.timezone);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    try {
      setTimezone(newTimezone);

      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          timezone: newTimezone,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success('Time zone updated successfully');
    } catch (error: any) {
      console.error('Error saving timezone:', error);
      toast.error('Failed to save timezone');
    }
  };

  const formatCurrentTime = () => {
    try {
      return currentTime.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return currentTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
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

  const handleSaveEdit = async () => {
    setIsSaving(true);

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Update user_metrics with TDEE data
      const { error: metricsError } = await supabase
        .from('user_metrics')
        .update({
          weight_kg: editForm.weight_kg,
          body_fat_percent: editForm.body_fat_percent,
          activity_level: editForm.activity_level,
          dietary_preference: editForm.dietary_preference,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (metricsError) throw metricsError;

      // Update user profile basic info if edited
      if (editedProfile) {
        const { upsertUserProfile } = await import('../../lib/supabase');
        await upsertUserProfile(user.id, {
          name: editedProfile.name,
          email: editedProfile.email,
          phone: editedProfile.phone || null,
          location: editedProfile.location || null,
          dob: editedProfile.dateOfBirth || null,
          bio: editedProfile.bio || null
        });
        onProfileUpdate(editedProfile);
      }

      setIsEditing(false);
      toast.success('Personal information updated successfully!');
      loadData();
    } catch (error) {
      console.error('Error saving personal information:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Personal Information</h3>

        {/* Beta User Badge */}
        {dbProfile?.beta_user && (
          <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
            Beta User
          </span>
        )}

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
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <>
          {/* Profile Completeness Gauge */}
          <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Profile Completeness</span>
              <span className="text-sm font-semibold text-white">
                {Math.round(
                  ([metrics.gender, metrics.age, metrics.height_cm, metrics.weight_kg, metrics.body_fat_percent, metrics.activity_level, metrics.tdee_calories]
                    .filter(Boolean).length / 7) * 100
                )}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ([metrics.gender, metrics.age, metrics.height_cm, metrics.weight_kg, metrics.body_fat_percent, metrics.activity_level, metrics.tdee_calories]
                      .filter(Boolean).length / 7) * 100
                  }%`
                }}
              />
            </div>
          </div>

          {/* TDEE Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">Gender</div>
              <div className="flex items-center gap-2">
                {metrics.gender ? (
                  <>
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                    <span className="text-white font-medium">{metrics.gender.charAt(0).toUpperCase() + metrics.gender.slice(1)}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-gray-400">Not set</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Age</div>
              <div className="flex items-center gap-2">
                {metrics.age ? (
                  <>
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                    <span className="text-white font-medium">{metrics.age} years</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-gray-400">Not set</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Height</div>
              <div className="flex items-center gap-2">
                {metrics.height_cm ? (
                  <>
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                    <span className="text-white font-medium">{formatHeight(metrics.height_cm)}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-gray-400">Not set</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Weight</div>
              <div className="flex items-center gap-2">
                {metrics.weight_kg ? (
                  <>
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                    <span className="text-white font-medium">{formatWeight(metrics.weight_kg)}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-gray-400">Not set</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Body Fat %</div>
              <div className="flex items-center gap-2">
                {metrics.body_fat_percent ? (
                  <>
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                    <span className="text-white font-medium">{metrics.body_fat_percent}%</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-gray-400">Not set</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Activity Level</div>
              <div className="flex items-center gap-2">
                {metrics.activity_level ? (
                  <>
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                    <span className="text-white font-medium text-sm">
                      {activityLevelLabels[metrics.activity_level]}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
                    <span className="text-gray-400">Not set</span>
                  </>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-400 mb-1">TDEE Status</div>
              <div className="flex items-center gap-2">
                {metrics.tdee ? (
                  <>
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-white font-medium">{Math.round(metrics.tdee)} kcal/day</span>
                    <span className="text-gray-400 text-xs">
                      (Calculated {metrics.last_tdee_update ? new Date(metrics.last_tdee_update).toLocaleDateString() : 'recently'})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} className="text-yellow-400" />
                    <span className="text-yellow-400 font-medium">Not completed</span>
                    <button
                      onClick={() => window.location.href = '/tdee'}
                      className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Complete TDEE Calculator
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Basic Contact Info */}
          <div className="space-y-3 pt-4 border-t border-gray-700">
            <div>
              <div className="text-sm text-gray-400 mb-1">
                <User size={14} className="inline mr-1" />
                Full Name
              </div>
              <div className="text-white">{userProfile?.name || 'Not set'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">
                <Mail size={14} className="inline mr-1" />
                Email
              </div>
              <div className="text-white">{userProfile?.email || 'Not set'}</div>
            </div>
            {userProfile?.phone && (
              <div>
                <div className="text-sm text-gray-400 mb-1">
                  <Phone size={14} className="inline mr-1" />
                  Phone
                </div>
                <div className="text-white">{userProfile.phone}</div>
              </div>
            )}
            {userProfile?.location && (
              <div>
                <div className="text-sm text-gray-400 mb-1">
                  <MapPin size={14} className="inline mr-1" />
                  Location
                </div>
                <div className="text-white">{userProfile.location}</div>
              </div>
            )}
            {userProfile?.dateOfBirth && (
              <div>
                <div className="text-sm text-gray-400 mb-1">
                  <Calendar size={14} className="inline mr-1" />
                  Date of Birth
                </div>
                <div className="text-white">{userProfile.dateOfBirth}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-400 mb-1">
                <Clock size={14} className="inline mr-1" />
                Time Zone
              </div>
              <div className="text-white">{timezone.replace('_', ' ')} - {formatCurrentTime()}</div>
            </div>
            {userProfile?.bio && (
              <div>
                <div className="text-sm text-gray-400 mb-1">Bio</div>
                <div className="text-white">{userProfile.bio}</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          {/* TDEE Fields */}
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

          {/* Basic Info Fields */}
          <div className="space-y-4 pt-4 border-t border-gray-700">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Full Name</label>
              <input
                type="text"
                value={editedProfile?.name || ''}
                onChange={(e) => setEditedProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <input
                type="email"
                value={editedProfile?.email || ''}
                onChange={(e) => setEditedProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Phone</label>
              <input
                type="tel"
                value={editedProfile?.phone || ''}
                onChange={(e) => setEditedProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Location</label>
              <input
                type="text"
                value={editedProfile?.location || ''}
                onChange={(e) => setEditedProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Date of Birth</label>
              <input
                type="date"
                value={editedProfile?.dateOfBirth || ''}
                onChange={(e) => setEditedProfile(prev => prev ? { ...prev, dateOfBirth: e.target.value } : null)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Time Zone</label>
              <select
                value={timezone}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="America/Anchorage">Alaska Time (AKT)</option>
                <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                <option value="UTC">UTC</option>
              </select>
              <div className="mt-2 text-xs text-gray-400">Current time: {formatCurrentTime()}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Bio</label>
              <textarea
                value={editedProfile?.bio || ''}
                onChange={(e) => setEditedProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                rows={3}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
