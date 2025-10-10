import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Clock, CreditCard as Edit3, X, Save } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

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

export const PersonalInformationSection: React.FC<PersonalInformationSectionProps> = ({
  userProfile,
  dbProfile,
  onProfileUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [editedProfile, setEditedProfile] = useState(userProfile);
  const [timezone, setTimezone] = useState('America/New_York');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load timezone from user preferences
  useEffect(() => {
    const loadTimezone = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_preferences')
          .select('timezone')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data && data.timezone) {
          setTimezone(data.timezone);
        }
      } catch (error) {
        console.error('Error loading timezone:', error);
      }
    };

    loadTimezone();
  }, []);

  // Sync editedProfile when userProfile changes
  useEffect(() => {
    setEditedProfile(userProfile);
  }, [userProfile]);

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

  const handleSaveProfile = async () => {
    if (!editedProfile) return;

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');

    try {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

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
      setIsEditing(false);
      setSaveSuccess('Profile updated successfully!');

      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveError('Failed to save profile. Please try again.');
      setTimeout(() => setSaveError(''), 5000);
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
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full">
              Beta User
            </span>
          </div>
        )}

        <button
          onClick={() => setIsEditing(!isEditing)}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
        >
          {isEditing ? (
            <>
              <X size={16} />
              Cancel
            </>
          ) : (
            <>
              <Edit3 size={16} />
              Edit
            </>
          )}
        </button>
      </div>

      {/* Save/Error Messages */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-600/20 border border-green-500/30 rounded-lg text-green-300 text-sm">
          {saveSuccess}
        </div>
      )}

      {saveError && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {saveError}
        </div>
      )}

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <User size={16} className="inline mr-2" />
            Full Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedProfile?.name || ''}
              onChange={(e) => setEditedProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your full name"
            />
          ) : (
            <div className="px-4 py-3 bg-gray-800 rounded-lg text-white">
              {userProfile?.name || 'Not set'}
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Mail size={16} className="inline mr-2" />
            Email Address
          </label>
          {isEditing ? (
            <input
              type="email"
              value={editedProfile?.email || ''}
              onChange={(e) => setEditedProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your email"
            />
          ) : (
            <div className="px-4 py-3 bg-gray-800 rounded-lg text-white">
              {userProfile?.email || 'Not set'}
            </div>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Phone size={16} className="inline mr-2" />
            Phone Number
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={editedProfile?.phone || ''}
              onChange={(e) => setEditedProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your phone number"
            />
          ) : (
            <div className="px-4 py-3 bg-gray-800 rounded-lg text-white">
              {userProfile?.phone || 'Not set'}
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <MapPin size={16} className="inline mr-2" />
            Location
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editedProfile?.location || ''}
              onChange={(e) => setEditedProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              placeholder="Enter your location"
            />
          ) : (
            <div className="px-4 py-3 bg-gray-800 rounded-lg text-white">
              {userProfile?.location || 'Not set'}
            </div>
          )}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Calendar size={16} className="inline mr-2" />
            Date of Birth
          </label>
          {isEditing ? (
            <input
              type="date"
              value={editedProfile?.dateOfBirth || ''}
              onChange={(e) => setEditedProfile(prev => prev ? { ...prev, dateOfBirth: e.target.value } : null)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          ) : (
            <div className="px-4 py-3 bg-gray-800 rounded-lg text-white">
              {userProfile?.dateOfBirth || 'Not set'}
            </div>
          )}
        </div>

        {/* Time Zone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            <Clock size={16} className="inline mr-2" />
            Time Zone
          </label>
          <select
            value={timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="America/Anchorage">Alaska Time (AKT)</option>
            <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
            <option value="UTC">UTC</option>
          </select>
          <div className="mt-2 bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Current time in your zone:</span>
              <span className="text-lg font-semibold text-white">{formatCurrentTime()}</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            This helps Pat understand your daily schedule and track meals accurately
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bio
          </label>
          {isEditing ? (
            <textarea
              value={editedProfile?.bio || ''}
              onChange={(e) => setEditedProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Tell us about yourself..."
            />
          ) : (
            <div className="px-4 py-3 bg-gray-800 rounded-lg text-white min-h-[80px]">
              {userProfile?.bio || 'No bio added yet'}
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {isEditing && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};
