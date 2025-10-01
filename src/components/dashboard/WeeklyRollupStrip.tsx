import React from 'react';
import { getScoreColorClasses } from '../../lib/freeScoring';

interface DayScore {
  date: string;
  score: number;
  dayOfWeek: string;
}

interface WeeklyRollupStripProps {
  dailyScores: DayScore[];
  className?: string;
}

export const WeeklyRollupStrip: React.FC<WeeklyRollupStripProps> = ({
  dailyScores,
  className = ''
}) => {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  // Get start of current week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Create array of days for current week
  const weekDays = daysOfWeek.map((dayName, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    const dateStr = date.toISOString().slice(0, 10);

    // Find score for this day
    const dayScore = dailyScores.find(ds => ds.date === dateStr);

    const isToday = date.toDateString() === today.toDateString();
    const isFuture = date > today;

    return {
      dayName,
      date: dateStr,
      score: dayScore?.score || 0,
      hasData: !!dayScore,
      isToday,
      isFuture
    };
  });

  return (
    <div className={`bg-gray-900 rounded-xl p-4 border border-gray-800 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">This Week</h3>
        <span className="text-xs text-gray-400">
          {weekDays.filter(d => d.hasData).length}/7 days logged
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {weekDays.map((day) => {
          const colorClasses = getScoreColorClasses(day.score);

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs text-gray-400">{day.dayName}</span>

              <div className="relative group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    day.isFuture
                      ? 'bg-gray-800 border border-gray-700'
                      : day.hasData
                      ? `${colorClasses.bg} border ${colorClasses.border}`
                      : 'bg-gray-800 border border-gray-700'
                  } ${day.isToday ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 animate-pulse' : ''}`}
                  title={day.isFuture ? 'Future' : day.hasData ? `Score: ${day.score}` : 'No data'}
                >
                  {day.hasData && (
                    <div className={`w-3 h-3 rounded-full ${colorClasses.dot}`} />
                  )}
                  {day.isFuture && (
                    <div className="w-2 h-2 rounded-full bg-gray-600" />
                  )}
                </div>

                {/* Tooltip */}
                {day.hasData && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {day.dayName}: {day.score}/100
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
