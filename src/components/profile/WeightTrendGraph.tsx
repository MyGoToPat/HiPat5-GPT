import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface WeightLog {
  weight_kg: number;
  log_date: string;
}

interface WeightTrendGraphProps {
  logs: WeightLog[];
  goalWeightKg?: number;
  useMetric?: boolean;
  days?: 7 | 30 | 90;
  className?: string;
}

export const WeightTrendGraph: React.FC<WeightTrendGraphProps> = ({
  logs,
  goalWeightKg,
  useMetric = false,
  days = 30,
  className = ''
}) => {
  if (logs.length === 0) {
    return (
      <div className={`bg-gray-800/50 rounded-xl p-6 text-center ${className}`}>
        <p className="text-gray-400 text-sm">No weight data yet</p>
        <p className="text-gray-500 text-xs mt-1">Start logging your weight to see trends</p>
      </div>
    );
  }

  const sortedLogs = [...logs].sort((a, b) =>
    new Date(a.log_date).getTime() - new Date(b.log_date).getTime()
  );

  const weights = sortedLogs.map(log => log.weight_kg);
  const minWeight = Math.min(...weights, ...(goalWeightKg ? [goalWeightKg] : []));
  const maxWeight = Math.max(...weights);
  const range = maxWeight - minWeight || 1;
  const padding = range * 0.1;

  const chartMin = minWeight - padding;
  const chartMax = maxWeight + padding;
  const chartRange = chartMax - chartMin;

  const width = 100;
  const height = 60;

  const points = sortedLogs.map((log, i) => {
    const x = (i / Math.max(sortedLogs.length - 1, 1)) * width;
    const y = height - ((log.weight_kg - chartMin) / chartRange) * height;
    return `${x},${y}`;
  }).join(' ');

  const pathData = `M ${points}`;

  const fillPathData = sortedLogs.length > 0
    ? `M 0,${height} L ${points} L ${width},${height} Z`
    : '';

  const formatWeight = (kg: number) => {
    return useMetric ? `${kg.toFixed(1)} kg` : `${(kg * 2.20462).toFixed(1)} lbs`;
  };

  const firstWeight = weights[0];
  const lastWeight = weights[weights.length - 1];
  const weightChange = lastWeight - firstWeight;
  const changePercent = ((weightChange / firstWeight) * 100).toFixed(1);

  const getTrendIcon = () => {
    if (Math.abs(weightChange) < 0.5) return <Minus size={16} className="text-gray-400" />;
    if (weightChange > 0) return <TrendingUp size={16} className="text-red-400" />;
    return <TrendingDown size={16} className="text-green-400" />;
  };

  const getTrendColor = () => {
    if (Math.abs(weightChange) < 0.5) return 'text-gray-400';
    if (weightChange > 0) return 'text-red-400';
    return 'text-green-400';
  };

  const getTrendText = () => {
    if (Math.abs(weightChange) < 0.5) return 'Stable';
    const changeStr = formatWeight(Math.abs(weightChange));
    if (weightChange > 0) return `Up ${changeStr}`;
    return `Down ${changeStr}`;
  };

  return (
    <div className={`bg-gray-800/50 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-bold text-white">{formatWeight(lastWeight)}</div>
          <div className="text-xs text-gray-400">Current weight</div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 font-medium ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm">{getTrendText()}</span>
          </div>
          <div className="text-xs text-gray-500">Last {days} days</div>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ height: '120px' }}
        >
          <defs>
            <linearGradient id="weightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </linearGradient>
          </defs>

          {fillPathData && (
            <path
              d={fillPathData}
              fill="url(#weightGradient)"
            />
          )}

          {goalWeightKg && goalWeightKg >= chartMin && goalWeightKg <= chartMax && (
            <line
              x1="0"
              y1={height - ((goalWeightKg - chartMin) / chartRange) * height}
              x2={width}
              y2={height - ((goalWeightKg - chartMin) / chartRange) * height}
              stroke="rgba(34, 197, 94, 0.5)"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          )}

          <polyline
            points={points}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {sortedLogs.map((log, i) => {
            const x = (i / Math.max(sortedLogs.length - 1, 1)) * width;
            const y = height - ((log.weight_kg - chartMin) / chartRange) * height;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                fill="rgb(59, 130, 246)"
              />
            );
          })}
        </svg>

        {goalWeightKg && (
          <div className="absolute top-0 right-0 text-xs text-green-400">
            Goal: {formatWeight(goalWeightKg)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>{sortedLogs.length} entries</span>
        {changePercent !== '0.0' && (
          <span className={getTrendColor()}>
            {changePercent}% change
          </span>
        )}
      </div>
    </div>
  );
};
