import React, { useEffect, useState } from 'react';
import { Clock, Dumbbell, Apple, Moon } from 'lucide-react';

interface FoodLog {
  id: string;
  food_name: string;
  grams: number;
  macros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  created_at: string;
}

interface Activity {
  id: string;
  type: 'workout' | 'meal' | 'sleep' | 'supplement';
  description: string;
  time: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
}

interface ActivityLogProps {
  recentFoodLogs: FoodLog[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ recentFoodLogs }) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  // Convert food logs to activities
  useEffect(() => {
    const foodActivities: Activity[] = recentFoodLogs.map(log => {
      const timeAgo = getTimeAgo(new Date(log.created_at));
      return {
        id: log.id,
        type: 'meal',
        description: `Logged: ${log.food_name} (${log.grams}g) - ${log.macros.kcal} calories`,
        time: timeAgo,
        icon: Apple
      };
    });

    // Add some mock activities for other types (since we only have food logs in Phase 1)
    const mockActivities: Activity[] = [
      {
        id: 'mock-1',
        type: 'supplement',
        description: 'Daily vitamins logged',
        time: '6 hours ago',
        icon: Clock
      },
      {
        id: 'mock-2',
        type: 'sleep',
        description: 'Sleep tracked: 7.5 hours',
        time: '8 hours ago',
        icon: Moon
      }
    ];

    // Combine and sort by most recent
    const allActivities = [...foodActivities, ...mockActivities]
      .sort((a, b) => {
        // Simple time sorting - in real implementation would use actual timestamps
        const aHours = parseInt(a.time.split(' ')[0]) || 0;
        const bHours = parseInt(b.time.split(' ')[0]) || 0;
        return aHours - bHours;
      })
      .slice(0, 4); // Show only last 4 activities

    setActivities(allActivities);
  }, [recentFoodLogs]);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [activities.length]);

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'workout': return 'text-orange-400 bg-orange-500/20';
      case 'meal': return 'text-green-400 bg-green-500/20';
      case 'supplement': return 'text-blue-400 bg-blue-500/20';
      case 'sleep': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-6 shadow-pat-card border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
        <div className="flex gap-1">
          {activities.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-pat-purple-500' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
      
      <div className="relative h-20 overflow-hidden">
        {activities.length > 0 ? (
          <div 
            key="activity-list-container" className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {activities.map((activity) => {
              const IconComponent = activity.icon;
              const colorClasses = getActivityColor(activity.type);
              
              return (
                <div key={activity.id} className="w-full flex-shrink-0 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses}`}>
                    <IconComponent size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium mb-1">
                      {activity.description}
                    </p>
                    <p className="text-gray-400 text-xs">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Apple size={24} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No activity logged today</p>
              <p className="text-gray-500 text-xs">Start by logging a meal!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};