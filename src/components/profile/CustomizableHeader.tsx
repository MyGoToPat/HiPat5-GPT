import React, { useState } from 'react';
import { PatAvatar } from '../PatAvatar';
import { Trophy, Target, Siren as Fire, Edit3, Palette, Image } from 'lucide-react';
import { PatMoodCalculator, UserMetrics } from '../../utils/patMoodCalculator';
import { MetricAlert } from '../../types/metrics';

interface CustomizableHeaderProps {
  userProfile: {
    name: string;
    bio: string;
    headerBackground?: string;
    headerColor?: string;
  } | null;
  onUpdate: (updates: any) => void;
  achievements: number;
  totalWorkouts: number;
  currentStreak: number;
  isLoading?: boolean;
}

export const CustomizableHeader: React.FC<CustomizableHeaderProps> = ({
  userProfile,
  onUpdate,
  achievements,
  totalWorkouts,
  currentStreak,
  isLoading = false
}) => {
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Handle loading state
  if (!userProfile) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 relative overflow-hidden animate-pulse">
        <div className="h-32 bg-white/10 rounded-lg mb-6"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full mx-auto mb-2"></div>
              <div className="h-4 bg-white/20 rounded mb-1"></div>
              <div className="h-3 bg-white/20 rounded w-16 mx-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Mock user metrics for mood calculation
  const userMetrics: UserMetrics = {
    workoutStreak: achievements >= 3 ? 6 : 2,
    sleepQuality: 80,
    proteinTarget: 88,
    lastWorkout: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000),
    missedWorkouts: 0,
    recentPRs: achievements >= 5 ? 2 : 0,
    consistencyScore: currentStreak >= 10 ? 92 : 75
  };

  const mockAlerts: MetricAlert[] = [];
  const patMood = PatMoodCalculator.calculateMood(userMetrics, mockAlerts);

  const backgroundOptions = [
    { id: 'gradient-blue', class: 'bg-gradient-to-r from-blue-600 to-blue-400', label: 'Ocean Blue' },
    { id: 'gradient-purple', class: 'bg-gradient-to-r from-purple-600 to-pink-600', label: 'Purple Sunset' },
    { id: 'gradient-green', class: 'bg-gradient-to-r from-green-600 to-teal-600', label: 'Forest Green' },
    { id: 'gradient-orange', class: 'bg-gradient-to-r from-orange-600 to-red-600', label: 'Fire Orange' },
    { id: 'gradient-dark', class: 'bg-gradient-to-r from-gray-800 to-gray-600', label: 'Dark Mode' },
    { id: 'solid-blue', class: 'bg-blue-600', label: 'Solid Blue' },
    { id: 'solid-purple', class: 'bg-purple-600', label: 'Solid Purple' },
    { id: 'solid-green', class: 'bg-green-600', label: 'Solid Green' }
  ];

  const handleBackgroundChange = (backgroundClass: string) => {
    onUpdate({ headerBackground: backgroundClass });
    setIsCustomizing(false);
  };

  return (
    <div className="relative">
      {/* Header Background */}
      <div className={`${userProfile.headerBackground || 'bg-gradient-to-r from-blue-600 to-purple-600'} rounded-2xl p-6 relative overflow-hidden`}>
        {/* Customize Button */}
        <button
          onClick={() => setIsCustomizing(!isCustomizing)}
          className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-lg transition-colors backdrop-blur-sm"
        >
          <Palette size={16} className="text-white" />
        </button>

        {/* Profile Content */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <PatAvatar size={80} mood={patMood} />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">{userProfile.name}</h1>
            <p className="text-white/80 text-sm leading-relaxed">{userProfile.bio}</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
              <Trophy size={20} className="text-white" />
            </div>
            <div className="text-xl font-bold text-white">
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                achievements
              )}
            </div>
            <div className="text-white/80 text-xs">Achievements</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
              <Target size={20} className="text-white" />
            </div>
            <div className="text-xl font-bold text-white">
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                totalWorkouts
              )}
            </div>
            <div className="text-white/80 text-xs">Workouts</div>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
              <Fire size={20} className="text-white" />
            </div>
            <div className="text-xl font-bold text-white">
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
              ) : (
                currentStreak
              )}
            </div>
            <div className="text-white/80 text-xs">Day Streak</div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
      </div>

      {/* Customization Panel */}
      {isCustomizing && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 rounded-2xl p-4 border border-gray-800 z-10 shadow-xl">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Palette size={16} />
            Customize Header
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {backgroundOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleBackgroundChange(option.class)}
                className={`${option.class} p-4 rounded-lg text-white text-sm font-medium hover:scale-105 transition-transform relative overflow-hidden`}
              >
                <div className="relative z-10">{option.label}</div>
                <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors"></div>
              </button>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors">
              <Image size={16} />
              Upload Custom Background
            </button>
          </div>
        </div>
      )}
    </div>
  );
};