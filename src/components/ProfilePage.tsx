import React, { useState, useEffect } from 'react';
import { PatAvatar } from './PatAvatar';
import { User, Mail, Phone, MapPin, Calendar, Settings, Bell, Shield, CreditCard, BarChart3, Edit3, Save, X, Camera, Globe, Moon, Sun, Smartphone, Trophy, Target, MessageSquare, Award, TrendingUp, Activity, Clock, CheckCircle, Volume2, Flame } from 'lucide-react';
import { AchievementBadges } from './profile/AchievementBadges';
import { ProgressVisualizations } from './profile/ProgressVisualizations';
import { AIInsights } from './profile/AIInsights';
import { CustomizableHeader } from './profile/CustomizableHeader';
import { getSupabase, getUserProfile, upsertUserProfile } from '../lib/supabase';
import RequestRoleUpgrade from './settings/RequestRoleUpgrade';
import { useNavigate } from 'react-router-dom';


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

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'account', label: 'Account', icon: Shield },
  { id: 'usage', label: 'Usage', icon: BarChart3 }
];

const QuickActions = () => {
  const navigate = useNavigate();
  return (
  <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
    <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-3">
      <button 
        onClick={() => navigate('/voice')}
        className="p-4 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded-lg text-left transition-colors"
      >
        <div className="text-orange-300 font-medium text-sm">Start Workout</div>
        <div className="text-orange-200 text-xs">Begin your training session</div>
      </button>
      <button 
        onClick={() => navigate('/voice')}
        className="p-4 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-left transition-colors"
      >
        <div className="text-green-300 font-medium text-sm">Log Meal</div>
        <div className="text-green-200 text-xs">Track your nutrition</div>
      </button>
      <button 
        onClick={() => navigate('/chat')}
        className="p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-left transition-colors"
      >
        <div className="text-blue-300 font-medium text-sm">Chat with Pat</div>
        <div className="text-blue-200 text-xs">Get personalized advice</div>
      </button>
      <button 
        onClick={() => navigate('/dashboard')}
        className="p-4 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-left transition-colors"
      >
        <div className="text-purple-300 font-medium text-sm">View Progress</div>
        <div className="text-purple-200 text-xs">Check your stats</div>
      </button>
    </div>
  </div>
  );
};

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'account' | 'usage'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dbProfile, setDbProfile] = useState<DatabaseProfile | null>(null);

  const [preferences, setPreferences] = useState<UserPreferences>({
    // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
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
        } else {
          // No profile found, create default profile for new user
          const defaultProfile: UserProfile = {
            name: user.data.user.email?.split('@')[0] || 'User',
            email: user.data.user.email || '',
            phone: '',
            location: '',
            dateOfBirth: '',
            bio: '',
            headerBackground: 'bg-gradient-to-r from-blue-600 to-purple-600',
            headerColor: 'white'
          };
          
          setUserProfile(defaultProfile);
          setEditedProfile(defaultProfile);
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
  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
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
      icon: Flame,
      earned: true,
      earnedDate: new Date('2024-01-20'),
      category: 'fitness'
    }
  ];

  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
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

    saveProfile();
  };

  const handleSavePreferences = () => {
    setPreferences(editedPreferences);
    // Here you would typically save to backend
  };

  const renderProfileTab = () => (
    <>
      {/* Customizable Header */}
      <CustomizableHeader 
        userProfile={userProfile}
        onUpdate={(updates) => {
          if (userProfile) {
            const updatedProfile = { ...userProfile, ...updates };
            setUserProfile(updatedProfile);
            setEditedProfile(updatedProfile);
          }
        }}
        achievements={achievements.filter(a => a.earned).length}
        totalWorkouts={47}
        currentStreak={12}
      />

      {/* Achievement Badges */}
      <AchievementBadges achievements={achievements} />


      {/* Contact Support */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Contact Support</h3>
        </div>
        <div className="space-y-4">
          <div className="bg-blue-600/20 p-4 rounded-lg border border-blue-500/30">
            <h4 className="font-medium text-blue-300 mb-2">Need Help?</h4>
            <p className="text-blue-200 text-sm mb-3">
              I'm here to help you get the most out of your health journey. You can reach out to our support team or chat with me directly.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/chat')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Chat with Pat
              </button>
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm font-medium transition-colors">
                Contact Support
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="text-center p-3 bg-gray-800 rounded-lg">
              <div className="text-sm font-medium text-white">Average Response</div>
              <div className="text-xs text-gray-400">&lt; 2 hours</div>
            </div>
            <div className="text-center p-3 bg-gray-800 rounded-lg">
              <div className="text-sm font-medium text-white">Satisfaction</div>
              <div className="text-xs text-gray-400">98.5%</div>
            </div>
          </div>
        </div>
      </div>
    </>
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
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

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
          
          <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
            <p className="text-blue-200 text-sm">
              <strong>Note:</strong> Pat's personality and communication style are managed by your trainer through the AI Agent system. These settings only control the voice output characteristics.
            </p>
          </div>
        </div>
      </div>

      {/* Current Goal */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Target size={20} className="text-green-400" />
          <h3 className="text-lg font-semibold text-white">Current Goal</h3>
        </div>
        <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-white">Lose 10 lbs by March 2024</h4>
            <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
              Active
            </span>
          </div>
          <p className="text-gray-300 text-sm mb-3">
            Target weight: 175 lbs • Current: 185.2 lbs • Progress: 68%
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
            <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: '68%' }}></div>
          </div>
          <div className="flex items-center gap-2 text-sm text-green-300">
            <TrendingUp size={14} />
            <span>On track to reach goal 2 weeks early</span>
          </div>
        </div>
      </div>

      {/* Monthly Consistency Score */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Award size={20} className="text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Monthly Consistency Score</h3>
        </div>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-700"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${88 * 2.51} 251`}
                className="text-purple-500 transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">88%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-white font-bold">92%</div>
              <div className="text-gray-400 text-xs">Workouts</div>
            </div>
            <div>
              <div className="text-white font-bold">85%</div>
              <div className="text-gray-400 text-xs">Nutrition</div>
            </div>
            <div>
              <div className="text-white font-bold">87%</div>
              <div className="text-gray-400 text-xs">Sleep</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <ProgressVisualizations />

      {/* AI Insights */}
      <AIInsights insights={aiInsights} />

      {/* Quick Actions */}
       <QuickActions />

    </div>
  );

  const renderAccountTab = () => (
    <div className="space-y-6">
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

          <RequestRoleUpgrade />
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

  const renderUsageTab = () => (
    <div className="space-y-6">
      {/* Usage Statistics */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          <BarChart3 size={20} className="inline mr-2" />
          Usage Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-blue-400" />
              <span className="text-gray-300 text-sm">Total Sessions</span>
            </div>
            <div className="text-2xl font-bold text-white">247</div>
            <div className="text-xs text-gray-400">This month: 32</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-green-400" />
              <span className="text-gray-300 text-sm">Total Time</span>
            </div>
            <div className="text-2xl font-bold text-white">156h</div>
            <div className="text-xs text-gray-400">This month: 18h</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={16} className="text-purple-400" />
              <span className="text-gray-300 text-sm">Messages</span>
            </div>
            <div className="text-2xl font-bold text-white">1,234</div>
            <div className="text-xs text-gray-400">This month: 156</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={16} className="text-orange-400" />
              <span className="text-gray-300 text-sm">Goals Completed</span>
            </div>
            <div className="text-2xl font-bold text-white">23</div>
            <div className="text-xs text-gray-400">This month: 3</div>
          </div>
        </div>
      </div>

      {/* Subscription Info */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          <CreditCard size={20} className="inline mr-2" />
          Subscription
        </h3>
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-white">Pro Plan</h4>
              <p className="text-blue-200 text-sm">Full access to all features</p>
            </div>
            <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-200">Next billing: March 15, 2024</span>
            <span className="text-white font-medium">$29.99/month</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pt-[44px]">      
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