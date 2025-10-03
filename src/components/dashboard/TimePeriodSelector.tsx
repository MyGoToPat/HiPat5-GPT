import React from 'react';
import { Calendar, BarChart3, TrendingUp } from 'lucide-react';

export type TimePeriod = 'daily' | 'weekly' | 'monthly';

interface TimePeriodSelectorProps {
  selected: TimePeriod;
  onChange: (period: TimePeriod) => void;
  className?: string;
}

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  selected,
  onChange,
  className = ''
}) => {
  const periods: { value: TimePeriod; label: string; icon: React.ReactNode }[] = [
    { value: 'daily', label: 'Daily', icon: <Calendar size={16} /> },
    { value: 'weekly', label: 'Weekly', icon: <BarChart3 size={16} /> },
    { value: 'monthly', label: 'Monthly', icon: <TrendingUp size={16} /> }
  ];

  return (
    <div className={`inline-flex bg-gray-900/50 rounded-xl p-1 ${className}`}>
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${selected === period.value
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }
          `}
        >
          {period.icon}
          <span className="hidden sm:inline">{period.label}</span>
        </button>
      ))}
    </div>
  );
};
