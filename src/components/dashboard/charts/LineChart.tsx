import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  showGrid?: boolean;
  showPoints?: boolean;
  color?: string;
  fillGradient?: boolean;
  className?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 200,
  showGrid = true,
  showPoints = true,
  color = '#3b82f6',
  fillGradient = true,
  className = ''
}) => {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = maxValue - minValue || 1;
  const padding = range * 0.1;

  const chartMin = minValue - padding;
  const chartMax = maxValue + padding;
  const chartRange = chartMax - chartMin;

  const width = 100;
  const chartHeight = 100;

  const points = data.map((point, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = chartHeight - ((point.value - chartMin) / chartRange) * chartHeight;
    return { x, y, ...point };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  const fillPathData = `M 0,${chartHeight} ${pathData} L ${width},${chartHeight} Z`;

  return (
    <div className={className} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${chartHeight}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          {fillGradient && (
            <linearGradient id={`lineGradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          )}
        </defs>

        {showGrid && (
          <g className="grid" opacity="0.1">
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2={width}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.5"
              />
            ))}
          </g>
        )}

        {fillGradient && (
          <path
            d={fillPathData}
            fill={`url(#lineGradient-${color})`}
          />
        )}

        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {showPoints && points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r="2"
              fill={color}
              className="hover:r-3 transition-all cursor-pointer"
            />
            <title>{`${point.label}: ${point.value.toFixed(1)}`}</title>
          </g>
        ))}
      </svg>

      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {data.length > 0 && (
          <>
            <span>{data[0].label}</span>
            <span>{data[data.length - 1].label}</span>
          </>
        )}
      </div>
    </div>
  );
};
