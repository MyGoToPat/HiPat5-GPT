import React, { useState, useEffect } from 'react';
import { AppBar } from './AppBar';
import { NavigationSidebar } from './NavigationSidebar';
import { PatAvatar } from './PatAvatar';
import { User, Mail, Phone, MapPin, Calendar, Settings, Bell, Shield, CreditCard, BarChart3, Edit3, Save, X, Camera, Globe, Moon, Sun, Smartphone, Trophy, Target, Zap, TrendingUp, Award, Star, MessageSquare, Activity, Plus, ChevronRight, Brain, Lightbulb, CheckCircle, Clock, Siren as Fire, Volume2 } from 'lucide-react';
import { AchievementBadges } from './profile/AchievementBadges';
import { CustomizableHeader } from './profile/CustomizableHeader';
import { getSupabase, getUserProfile, upsertUserProfile } from '../lib/supabase';
import RequestRoleUpgrade from './settings/RequestRoleUpgrade';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  dateOfBirth: string;
  bio: string;
  profilePicture?: string;
  headerBackground?: string;
  headerColor?: string;
}

interface DatabaseProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  dob?: string;
  bio?: string;
  beta_user: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  patPersonality: 'professional' | 'friendly' | 'casual';
  voiceSettings: {
    speed: number;
    pitch: number;
  };
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  earned: boolean;
  earnedDate?: Date;
  progress?: number;
  maxProgress?: number;
  category: 'fitness' | 'nutrition' | 'sleep' | 'consistency';
}

interface AIInsight {
  id: string;
  type: 'recommendation' | 'achievement' | 'warning' | 'tip';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const [showNavigation, setShowNavigation] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'account' | 'usage'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dbProfile, setDbProfile] = useState<DatabaseProfile | null>(null);

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
    language: 'English',
    notifications: {
      email: true,
      push: true,
      sms: false
    },
    patPersonality: 'friendly',
    voiceSettings: {
      speed: 1.0,
      pitch: 1.0
    }
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [editedPreferences, setEditedPreferences] = useState<UserPreferences>(preferences);

  // Load user profile on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const supabase = getSupabase();
        const user = await supabase.auth.getUser();
        if (!user.data.user) {
          console.error('No authenticated user');
          return;
        }

        const profile = await getUserProfile(user.data.user.id);
        if (profile) {
          setDbProfile(profile);
          
          // Convert database profile to UI profile format
          const uiProfile: UserProfile = {
            name: profile.name,
            email: profile.email,
            phone: profile.phone || '',
            location: profile.location || '',
            dateOfBirth: profile.dob || '',
            bio: profile.bio || '',
            headerBackground: 'bg-gradient-to-r from-blue-600 to-purple-600',
            headerColor: 'white'
          };
          
          setUserProfile(uiProfile);
          setEditedProfile(uiProfile);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  // Mock achievements data
  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'Consistency Champion',
      description: 'Worked out 5 days in a row',
      icon: Trophy,
      earned: true,
      earnedDate: new Date('2024-01-15'),
      category: 'consistency'
    },
    {
      id: '2',
      title: 'PR Crusher',
      description: 'Set 3 personal records this month',
      icon: Award,
      earned: true,
      earnedDate: new Date('2024-01-18'),
      category: 'fitness'
    },
    {
      id: '3',
      title: 'Sleep Master',
      description: 'Maintain 8+ hours sleep for 7 days',
      icon: Moon,
      earned: false,
      progress: 5,
      maxProgress: 7,
      category: 'sleep'
    },
    {
      id: '4',
      title: 'Protein Pro',
      description: 'Hit protein target 30 days straight',
      icon: Target,
      earned: false,
      progress: 23,
      maxProgress: 30,
      category: 'nutrition'
    },
    {
      id: '5',
      title: 'Volume Victor',
      description: 'Reach 50k lbs weekly volume',
      icon: Fire,
      earned: true,
      earnedDate: new Date('2024-01-20'),
      category: 'fitness'
    }
  ];

  // Mock AI insights
  const aiInsights: AIInsight[] = [
    {
      id: '1',
      type: 'recommendation',
      title: 'Optimize Your Recovery',
      description: 'Based on your recent workouts, I recommend adding 15 minutes of stretching after your sessions. Your muscle tension indicators suggest this could improve your next-day performance by 12%.',
      actionable: true,
      priority: 'high',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      type: 'achievement',
      title: 'Protein Intake Improvement',
      description: 'Great job! Your protein consistency has improved 40% this month. You\'re now hitting your target 85% of the time, up from 60%.',
      actionable: false,
      priority: 'medium',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
    },
    {
      id: '3',
      type: 'tip',
      title: 'Sleep Optimization Window',
      description: 'I\'ve noticed you perform best when you sleep between 10:30 PM - 6:30 AM. Consider adjusting your bedtime by 30 minutes earlier for optimal recovery.',
      actionable: true,
      priority: 'medium',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000)
    },
    {
      id: '4',
      type: 'warning',
      title: 'Potential Overreaching',
      description: 'Your training volume has increased 25% this week while sleep quality decreased. Consider a deload or extra rest day to prevent burnout.',
      actionable: true,
      priority: 'high',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
    }
  ];

  const handleSaveProfile = () => {
    if (!editedProfile || !dbProfile) return;

    const saveProfile = async () => {
      setIsSaving(true);
      setSaveError('');
      setSaveSuccess('');
      
      try {
        const supabase = getSupabase();
        const user = await supabase.auth.getUser();
        if (!user.data.user) {
          throw new Error('No authenticated user');
        }

        await upsertUserProfile(user.data.user.id, {
          name: editedProfile.name,
          email: editedProfile.email,
          phone: editedProfile.phone || null,
          location: editedProfile.location || null,
          dob: editedProfile.dateOfBirth || null,
          bio: editedProfile.bio || null
        });

        setUserProfile(editedProfile);
        setIsEditing(false);
        setSaveSuccess('Profile saved successfully!');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(''), 3000);
        
      } catch (error) {
        console.error('Error saving profile:', error);
        setSaveError('Failed to save profile. Please try again.');
      } finally {
        setIsSaving(false);
      }
    };

    saveProfile();
  };

  const handleCancelEdit = () => {
    setEditedProfile(userProfile);
    setIsEditing(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSavePreferences = () => {
    setPreferences(editedPreferences);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'usage', label: 'Usage', icon: BarChart3 }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white">Unable to load profile. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Customizable Header */}
      <CustomizableHeader 
        profile={userProfile}
        onUpdate={(updates) => setUserProfile({ ...userProfile, ...updates })}
        achievements={achievements.filter(a => a.earned).length}
        totalWorkouts={156}
        currentStreak={12}
      />

      {/* Quick Actions */}
      {/* Achievement Badges */}
      <AchievementBadges achievements={achievements} />

      {/* Profile Picture Section */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center gap-6">
          <div className="relative">
            <PatAvatar size={80} mood="neutral" />
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors">
              <Camera size={16} className="text-white" />
            </button>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Profile Picture</h3>
            <p className="text-gray-400 text-sm mb-3">Update your profile picture to personalize your Pat experience</p>
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
              Change Picture
            </button>
          </div>
        </div>
      </div>

      {/* Personal Information */}
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
            {isEditing ? <X size={16} /> : <Edit3 size={16} />}
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Save Success Message */}
        {saveSuccess && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">{saveSuccess}</p>
          </div>
        )}

        {/* Save Error Message */}
        {saveError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{saveError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
            ) : (
              <p className="px-4 py-3 bg-gray-800 rounded-lg text-white">{userProfile?.name}</p>
            )}
          </div>

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
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
            ) : (
              <p className="px-4 py-3 bg-gray-800 rounded-lg text-white">{userProfile?.email}</p>
            )}
          </div>

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
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
            ) : (
              <p className="px-4 py-3 bg-gray-800 rounded-lg text-white">{userProfile?.phone || 'Not provided'}</p>
            )}
          </div>

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
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
            ) : (
              <p className="px-4 py-3 bg-gray-800 rounded-lg text-white">{userProfile?.location || 'Not provided'}</p>
            )}
          </div>

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
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSaving}
              />
            ) : (
              <p className="px-4 py-3 bg-gray-800 rounded-lg text-white">{userProfile?.dateOfBirth || 'Not provided'}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bio
            </label>
            {isEditing ? (
              <textarea
                value={editedProfile?.bio || ''}
                onChange={(e) => setEditedProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about yourself..."
                disabled={isSaving}
              />
            ) : (
              <p className="px-4 py-3 bg-gray-800 rounded-lg text-white min-h-[80px]">{userProfile?.bio || 'No bio provided'}</p>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      {/* Theme Settings */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Theme</label>
            <div className="flex gap-3">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'auto', label: 'Auto', icon: Smartphone }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    setEditedPreferences({ ...editedPreferences, theme: value as any });
                    handleSavePreferences();
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                    editedPreferences.theme === value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
      {/* Notification Settings */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          <Bell size={20} className="inline mr-2" />
          Notifications
        </h3>
        <div className="space-y-4">
          {Object.entries(editedPreferences.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium capitalize">{key} Notifications</p>
                <p className="text-gray-400 text-sm">Receive notifications via {key}</p>
              </div>
              <button
                onClick={() => {
                  const newPrefs = {
                    ...editedPreferences,
                    notifications: {
                      ...editedPreferences.notifications,
                      [key]: !value
                    }
                  };
                  setEditedPreferences(newPrefs);
                  handleSavePreferences();
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pat Personality */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Pat's Personality</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { value: 'professional', label: 'Professional', desc: 'Formal and business-like' },
            { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
            { value: 'casual', label: 'Casual', desc: 'Relaxed and informal' }
          ].map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => {
                setEditedPreferences({ ...editedPreferences, patPersonality: value as any });
                handleSavePreferences();
              }}
              className={`p-4 rounded-lg border text-left transition-colors ${
                editedPreferences.patPersonality === value
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <p className="font-medium">{label}</p>
              <p className="text-sm opacity-80">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Settings */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          <Volume2 size={20} className="inline mr-2" />
          Voice Settings
        </h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Speech Speed: {editedPreferences.voiceSettings.speed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={editedPreferences.voiceSettings.speed}
              onChange={(e) => {
                const newPrefs = {
                  ...editedPreferences,
                  voiceSettings: {
                    ...editedPreferences.voiceSettings,
                    speed: parseFloat(e.target.value)
                  }
                };
                setEditedPreferences(newPrefs);
                handleSavePreferences();
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Voice Pitch: {editedPreferences.voiceSettings.pitch}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={editedPreferences.voiceSettings.pitch}
              onChange={(e) => {
                const newPrefs = {
                  ...editedPreferences,
                  voiceSettings: {
                    ...editedPreferences.voiceSettings,
                    pitch: parseFloat(e.target.value)
                  }
                };
                setEditedPreferences(newPrefs);
                handleSavePreferences();
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
      {/* Security Settings */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          <Shield size={20} className="inline mr-2" />
          Security
        </h3>
        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <div className="text-left">
              <p className="text-white font-medium">Change Password</p>
              <p className="text-gray-400 text-sm">Update your account password</p>
            </div>
            <Edit3 size={16} className="text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <div className="text-left">
              <p className="text-white font-medium">Two-Factor Authentication</p>
              <p className="text-gray-400 text-sm">Add an extra layer of security</p>
            </div>
            <div className="text-green-400 text-sm">Enabled</div>
          </button>

          <button className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <div className="text-left">
              <p className="text-white font-medium">Login History</p>
              <p className="text-gray-400 text-sm">View recent account activity</p>
            </div>
            <Edit3 size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Subscription */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          <CreditCard size={20} className="inline mr-2" />
          Subscription
        </h3>
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Pat Pro</p>
              <p className="text-blue-100 text-sm">Advanced AI features & unlimited usage</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">$19.99</p>
              <p className="text-blue-100 text-sm">/month</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <button className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Manage Subscription
          </button>
          <button className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            Billing History
          </button>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Data & Privacy</h3>
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <div className="text-left">
              <p className="text-white font-medium">Download My Data</p>
              <p className="text-gray-400 text-sm">Export all your data</p>
            </div>
            <Edit3 size={16} className="text-gray-400" />
          </button>

          <button className="w-full flex items-center justify-between p-4 bg-red-900 hover:bg-red-800 rounded-lg transition-colors">
            <div className="text-left">
              <p className="text-red-300 font-medium">Delete Account</p>
              <p className="text-red-400 text-sm">Permanently delete your account</p>
            </div>
            <Edit3 size={16} className="text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderUsageTab = () => (
    <div className="space-y-6">
      {/* Usage Statistics */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-6">Usage Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">1,247</div>
            <p className="text-gray-400 text-sm">Total Conversations</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">89h</div>
            <p className="text-gray-400 text-sm">Time Saved</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">156</div>
            <p className="text-gray-400 text-sm">Goals Achieved</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Fitness Tracking</span>
              <span>45%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-orange-500 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Meal Planning</span>
              <span>30%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '30%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm text-gray-300 mb-2">
              <span>General Chat</span>
              <span>25%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '25%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'Logged workout session', time: '2 hours ago', type: 'fitness' },
            { action: 'Updated meal plan', time: '5 hours ago', type: 'nutrition' },
            { action: 'Set new reminder', time: '1 day ago', type: 'productivity' },
            { action: 'Completed daily check-in', time: '2 days ago', type: 'wellness' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">{activity.action}</p>
                <p className="text-gray-400 text-xs">{activity.time}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                activity.type === 'fitness' ? 'bg-orange-500' :
                activity.type === 'nutrition' ? 'bg-green-500' :
                activity.type === 'productivity' ? 'bg-blue-500' : 'bg-purple-500'
              }`}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <NavigationSidebar 
        isOpen={showNavigation} 
        onClose={() => setShowNavigation(false)} 
        onNavigate={onNavigate}
        onNewChat={() => onNavigate('chat')}
        userProfile={null}
      />
      
      <AppBar 
        title="Profile" 
        onBack={() => onNavigate('dashboard')}
        onMenu={() => setShowNavigation(true)}
        showBack
      />
      
      <div className="px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex overflow-x-auto mb-6 bg-gray-900 rounded-2xl p-2">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <IconComponent size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'preferences' && renderPreferencesTab()}
        {activeTab === 'account' && renderAccountTab()}
        {activeTab === 'usage' && renderUsageTab()}
      </div>
    </div>
  );
};