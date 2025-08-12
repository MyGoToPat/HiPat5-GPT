import React, { useState } from 'react';
import { Trophy, Star, Lock, Calendar, TrendingUp } from 'lucide-react';

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

interface AchievementBadgesProps {
  achievements: Achievement[];
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ achievements }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All', color: 'text-gray-300' },
    { id: 'fitness', label: 'Fitness', color: 'text-orange-400' },
    { id: 'nutrition', label: 'Nutrition', color: 'text-green-400' },
    { id: 'sleep', label: 'Sleep', color: 'text-blue-400' },
    { id: 'consistency', label: 'Consistency', color: 'text-purple-400' }
  ];

  const getCategoryColor = (category: Achievement['category']) => {
    switch (category) {
      case 'fitness': return 'from-orange-500 to-red-500';
      case 'nutrition': return 'from-green-500 to-teal-500';
      case 'sleep': return 'from-blue-500 to-indigo-500';
      case 'consistency': return 'from-purple-500 to-pink-500';
    }
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const earnedCount = achievements.filter(a => a.earned).length;
  const totalCount = achievements.length;

  return (
    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Achievements</h3>
        </div>
        <div className="text-sm text-gray-400">
          {earnedCount}/{totalCount} earned
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
          <span>Overall Progress</span>
          <span>{Math.round((earnedCount / totalCount) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(earnedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {categories.map((category) => ( // eslint-disable-next-line react/jsx-key
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => {
          const IconComponent = achievement.icon;
          const isEarned = achievement.earned;
          const hasProgress = achievement.progress !== undefined && achievement.maxProgress !== undefined;
          
          return (
            <div
              key={achievement.id}
              className={`relative p-4 rounded-xl border transition-all hover:scale-105 cursor-pointer group ${
                isEarned
                  ? 'bg-gradient-to-br ' + getCategoryColor(achievement.category) + ' border-transparent'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              {/* Achievement Icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 mx-auto ${
                isEarned ? 'bg-white/20' : 'bg-gray-700'
              }`}>
                {isEarned ? (
                  <IconComponent size={20} className="text-white" />
                ) : (
                  <Lock size={20} className="text-gray-500" />
                )}
              </div>

              {/* Achievement Info */}
              <div className="text-center">
                <h4 className={`font-semibold text-sm mb-1 ${
                  isEarned ? 'text-white' : 'text-gray-300'
                }`}>
                  {achievement.title}
                </h4>
                <p className={`text-xs leading-relaxed ${
                  isEarned ? 'text-white/80' : 'text-gray-400'
                }`}>
                  {achievement.description}
                </p>

                {/* Progress Bar for Unearned Achievements */}
                {!isEarned && hasProgress && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{achievement.progress}/{achievement.maxProgress}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${(achievement.progress! / achievement.maxProgress!) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Earned Date */}
                {isEarned && achievement.earnedDate && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-xs text-white/60">
                    <Calendar size={10} />
                    <span>{achievement.earnedDate.toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Earned Badge */}
              {isEarned && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Star size={12} className="text-white" />
                </div>
              )}

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          );
        })}
      </div>

      {/* Next Achievement Preview */}
      {earnedCount < totalCount && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-blue-300 text-sm font-medium mb-1">
            <TrendingUp size={14} />
            Next Achievement
          </div>
          <p className="text-blue-200 text-xs">
            Keep up your consistency streak to unlock "Sleep Master" - you're {
              achievements.find(a => !a.earned && a.progress)?.maxProgress! - 
              achievements.find(a => !a.earned && a.progress)?.progress!
            } days away!
          </p>
        </div>
      )}
    </div>
  );
};