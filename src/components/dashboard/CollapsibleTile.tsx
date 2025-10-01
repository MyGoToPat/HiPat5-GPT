import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Sparkline } from './Sparkline';

interface CollapsibleTileProps {
  title: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  iconColor: string;
  hoverColor: string;
  children: React.ReactNode;
  condensedContent: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  score?: number;
  sparklineData?: number[];
  stateDot?: 'green' | 'amber' | 'red';
  trendDirection?: 'up' | 'down' | 'flat';
}

export const CollapsibleTile: React.FC<CollapsibleTileProps> = ({
  title,
  icon: IconComponent,
  iconColor,
  hoverColor,
  children,
  condensedContent,
  className = '',
  headerAction,
  score,
  sparklineData,
  stateDot,
  trendDirection
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDotColor = () => {
    if (!stateDot) return 'bg-gray-600';
    if (stateDot === 'green') return 'bg-green-500';
    if (stateDot === 'amber') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = () => {
    if (!trendDirection) return null;
    if (trendDirection === 'up') return <TrendingUp size={14} className="text-green-400" />;
    if (trendDirection === 'down') return <TrendingDown size={14} className="text-red-400" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  return (
    <div className={`bg-gray-900 rounded-2xl shadow-pat-card border border-gray-800 hover:${hoverColor} transition-all duration-300 cursor-pointer group w-full min-h-[180px] sm:min-h-[220px] overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4"
      >
        <div
          className="flex items-center gap-3 cursor-pointer flex-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <IconComponent size={20} className={`${iconColor} group-hover:brightness-110 transition-all`} />
            {stateDot && (
              <div className={`w-2 h-2 rounded-full ${getDotColor()} animate-pulse`} />
            )}
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-white truncate" title={title}>{title}</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Score and Sparkline */}
          {(score !== undefined || sparklineData) && (
            <div className="flex items-center gap-2" onClick={() => setIsExpanded(!isExpanded)}>
              {sparklineData && sparklineData.length > 0 && (
                <Sparkline
                  data={sparklineData}
                  width={50}
                  height={20}
                  color="rgba(255, 255, 255, 0.6)"
                  className="opacity-75 group-hover:opacity-100 transition-opacity"
                />
              )}
              {score !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="text-xl font-bold text-white">{score}</span>
                  {getTrendIcon()}
                </div>
              )}
            </div>
          )}

          {headerAction}
          <button
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6 w-full overflow-hidden break-words">
        <div className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'opacity-100' : 'opacity-100'
        }`}>
          {isExpanded ? children : condensedContent}
        </div>
      </div>
      
      {/* Expand/Collapse Animation */}
      <div className={`overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-none' : 'max-h-0'
      }`}>
        {isExpanded && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-800 pt-3 sm:pt-4">
            <div className="text-xs text-gray-400 text-center hidden sm:block">
              Click header to collapse
            </div>
          </div>
        )}
      </div>
    </div>
  );
};