import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
  target?: number;
}

interface BarChartProps {
  data: DataPoint[];
  height?: number;
  showValues?: boolean;
  showTarget?: boolean;
  color?: string;
  className?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 200,
  showValues = false,
  showTarget = false,
  color = '#3b82f6',
  className = ''
}) => {
  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.target || 0)), 1);

  return (
    <div className={className} style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((point, index) => {
          const barHeight = (point.value / maxValue) * 100;
          const targetHeight = point.target ? (point.target / maxValue) * 100 : 0;
          const barColor = point.color || color;

          return (
            <div key={index} className="flex-1 flex flex-col items-center group relative">
              <div className="w-full relative" style={{ height: '100%' }}>
                {showTarget && point.target && (
                  <div
                    className="absolute bottom-0 w-full border-t-2 border-dashed border-gray-500 opacity-50"
                    style={{ bottom: `${targetHeight}%` }}
                  />
                )}

                <div className="absolute bottom-0 w-full flex justify-center">
                  <div
                    className="w-full rounded-t-sm transition-all duration-300 hover:brightness-110 cursor-pointer"
                    style={{
                      height: `${barHeight}%`,
                      backgroundColor: barColor
                    }}
                  >
                    {showValues && (
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-white">
                        {point.value.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg transition-opacity pointer-events-none whitespace-nowrap z-10">
                <div>{point.label}</div>
                <div className="font-bold">{point.value.toFixed(1)}</div>
                {point.target && (
                  <div className="text-gray-400">Target: {point.target.toFixed(1)}</div>
                )}
              </div>

              <span className="text-xs text-gray-500 mt-2 text-center truncate w-full">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
