import React from 'react';

interface VoiceWaveformProps {
  isActive?: boolean;
  barCount?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isActive = false,
  barCount = 7,
  height = 16,
  color = 'bg-yellow-400',
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      {Array.from({ length: barCount }).map((_, index) => (
        <div
          key={index}
          className={`w-1 ${color} rounded-full transition-all duration-300 ${
            isActive ? 'animate-pulse' : ''
          }`}
          style={{
            height: isActive ? Math.random() * height + height/2 : height/2,
            animationDelay: `${index * 0.1}s`,
            animationDuration: '0.9s'
          }}
        />
      ))}
    </div>
  );
};