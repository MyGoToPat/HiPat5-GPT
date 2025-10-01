import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface BaselineBannerProps {
  comparisonWindow: 'baseline' | '7day' | '30day' | '90day';
  onComparisonChange: (window: 'baseline' | '7day' | '30day' | '90day') => void;
  baselineDate?: string;
  className?: string;
}

export const BaselineBanner: React.FC<BaselineBannerProps> = ({
  comparisonWindow,
  onComparisonChange,
  baselineDate,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const windowLabels = {
    baseline: 'Onboarding Baseline',
    '7day': 'Last 7 Days',
    '30day': 'Last 30 Days',
    '90day': 'Last 90 Days'
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg transition-colors"
      >
        <Calendar size={16} className="text-gray-400" />
        <div className="text-left">
          <div className="text-xs text-gray-400">Comparing to:</div>
          <div className="text-sm text-white font-medium">
            {windowLabels[comparisonWindow]}
            {comparisonWindow === 'baseline' && baselineDate && (
              <span className="text-gray-400 ml-1">({formatDate(baselineDate)})</span>
            )}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20">
            <div className="p-2">
              {(Object.keys(windowLabels) as Array<keyof typeof windowLabels>).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    onComparisonChange(key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    comparisonWindow === key
                      ? 'bg-orange-600/20 text-orange-300'
                      : 'text-gray-300 hover:bg-gray-750'
                  }`}
                >
                  <div className="font-medium">{windowLabels[key]}</div>
                  {key === 'baseline' && baselineDate && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDate(baselineDate)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
