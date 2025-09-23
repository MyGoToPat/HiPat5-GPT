import React from 'react';
import { Trophy, Target, Award, Star, Clock, Zap, Plus } from 'lucide-react';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

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
  className?: string;
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ achievements, className = '' }) => {
  // Use provided achievements or empty array if none provided
  const validAchievements = achievements || [];
  const earnedAchievements = validAchievements.filter(a => a.earned);
  const progressAchievements = validAchievements.filter(a => !a.earned && a.progress !== undefined);

  const getCategoryColor = (category: Achievement['category']) => {
    switch (category) {
      case 'fitness':
        return 'from-orange-500 to-red-500';
      case 'nutrition':
        return 'from-green-500 to-emerald-500';
      case 'sleep':
        return 'from-indigo-500 to-purple-500';
      case 'consistency':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const formatEarnedDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`bg-gray-900 rounded-2xl p-6 border border-gray-800 ${className}`} style={{ position: 'relative' }}>
      <DataSourceBadge source="live" />
      <div className="flex items-center gap-2 mb-6">
        <Trophy size={20} className="text-yellow-400" />
        <h3 className="text-lg font-semibold text-white">Achievements</h3>
        <span className="px-2 py-1 bg-yellow-600/20 text-yellow-300 text-xs font-medium rounded-full">
          {earnedAchievements.length} earned
        </span>
      </div>

      {/* Earned Achievements */}
      {earnedAchievements.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Earned Achievements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {earnedAchievements.map((achievement) => {
              const IconComponent = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg bg-gradient-to-r ${getCategoryColor(achievement.category)} text-white relative overflow-hidden`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <IconComponent size={20} className="text-white" />
                    <span className="font-semibold text-sm">{achievement.title}</span>
                  </div>
                  
                  <p className="text-white/80 text-xs mb-2">
                    {achievement.description}
                  </p>
                  
                  {achievement.earnedDate && (
                    <div className="flex items-center gap-1 text-white/70 text-xs">
                      <Star size={12} />
                      <span>Earned {formatEarnedDate(achievement.earnedDate)}</span>
                    </div>
                  )}
                  
                  {/* Shine effect */}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-pulse"></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Achievements */}
      {progressAchievements.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">In Progress</h4>
          <div className="space-y-3">
            {progressAchievements.map((achievement) => {
              const IconComponent = achievement.icon;
              const progressPercent = achievement.progress && achievement.maxProgress 
                ? Math.round((achievement.progress / achievement.maxProgress) * 100)
                : 0;
              
              return (
                <div
                  key={achievement.id}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <IconComponent size={16} className="text-gray-400" />
                    <span className="font-medium text-white text-sm">{achievement.title}</span>
                  </div>
                  
                  <p className="text-gray-300 text-xs mb-3">
                    {achievement.description}
                  </p>
                  
                  {achievement.progress !== undefined && achievement.maxProgress && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{achievement.progress}/{achievement.maxProgress}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {validAchievements.length === 0 && (
        <div className="text-center py-8">
          <Trophy size={48} className="text-gray-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-400 mb-2">Start Your Achievement Journey</h4>
          <p className="text-gray-500 text-sm mb-4">Earn your first achievement by completing your onboarding and logging your first workout or meal!</p>
          <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
            <Plus size={16} />
            <span>Complete onboarding to unlock achievements</span>
          </div>
        </div>
      )}
    </div>
  );
};