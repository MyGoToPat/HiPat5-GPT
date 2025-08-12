import React from 'react';
import { Coffee } from 'lucide-react';

interface BreakBannerProps {
  timeRemaining: number;
}

export const BreakBanner: React.FC<BreakBannerProps> = ({ timeRemaining }) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-10">
      <div className="break-pulse bg-yellow-500 text-yellow-900 px-6 py-4 text-center shadow-lg">
        <div className="flex items-center justify-center gap-3">
          <Coffee size={24} />
          <div>
            <div className="text-xl font-bold">BREAK MODE</div>
            <div className="text-lg">
              Machine occupied for {formatTime(timeRemaining)}
            </div>
          </div>
          <Coffee size={24} />
        </div>
      </div>
    </div>
  );
};