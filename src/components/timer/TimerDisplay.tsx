import React from 'react';
import { useTimer } from '../../context/TimerContext';
import { BreakBanner } from './BreakBanner';

interface TimerDisplayProps {
  timerEngine: any;
  className?: string;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timerEngine,
  className = ''
}) => {
  const { settings } = useTimer();
  const { timerState, currentInterval, formatTime } = timerEngine;

  const getBackgroundClass = () => {
    if (!currentInterval) return 'bg-gray-100';
    
    switch (currentInterval.type) {
      case 'work':
        return 'timer-work';
      case 'rest':
        return 'timer-rest';
      case 'warm':
        return 'timer-warm';
      case 'cool':
        return 'timer-cool';
      default:
        return 'bg-gray-100';
    }
  };

  const getTextColor = () => {
    return currentInterval?.type === 'rest' ? 'text-white' : 'text-white';
  };

  const formatCycleDisplay = () => {
    if (!timerState.preset) return '';
    return `Round ${timerState.currentCycle + 1} of ${timerState.preset.cycles}`;
  };

  const getProgressPercentage = () => {
    if (!currentInterval || !timerState.preset) return 0;
    const intervalDuration = currentInterval.duration;
    const elapsed = intervalDuration - timerState.timeRemaining;
    return (elapsed / intervalDuration) * 100;
  };

  return (
    <div className={`timer-display ${getBackgroundClass()} ${className} relative flex flex-col items-center justify-center p-8 ${settings.lowPowerMode && document.hidden ? 'low-power' : ''}`}>
      {/* Break Mode Banner */}
      {timerState.isBreakMode && (
        <BreakBanner timeRemaining={timerState.timeRemaining} />
      )}

      {/* Main Timer Display */}
      <div className={`text-center ${getTextColor()}`}>
        {/* Cycle Information */}
        {timerState.preset && (
          <div className="mb-4">
            <h2 className="text-2xl md:text-3xl font-bold opacity-90 mb-2">
              {timerState.preset.name}
            </h2>
            <p className="text-lg md:text-xl opacity-75">
              {formatCycleDisplay()}
            </p>
          </div>
        )}

        {/* Current Interval */}
        {currentInterval && (
          <div className="mb-6">
            <h3 className="text-3xl md:text-4xl font-bold mb-2">
              {currentInterval.name}
            </h3>
            <div className="w-32 h-1 bg-white/30 rounded-full mx-auto overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Time Display */}
        <div className="mb-8">
          <div 
            className="text-8xl md:text-9xl font-mono font-bold leading-none"
            style={{ 
              fontSize: 'clamp(4rem, 15vw, 8rem)',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            aria-live="polite"
            aria-label={`${formatTime(timerState.timeRemaining)} remaining`}
          >
            {formatTime(timerState.timeRemaining)}
          </div>
          
          {/* Next Interval Preview */}
          {timerState.preset && timerState.isRunning && (
            <div className="mt-4 opacity-75">
              <p className="text-lg">
                Next: {getNextIntervalName()}
              </p>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-center gap-6 text-lg opacity-75">
          {timerState.isPaused && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span>Paused</span>
            </div>
          )}
          
          {timerState.isBreakMode && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              <span>Break Mode</span>
            </div>
          )}
          
          {!timerState.isRunning && !timerState.isPaused && (
            <div className="text-xl">
              Ready to start
            </div>
          )}
        </div>
      </div>

      {/* Accessibility - Screen reader updates */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      >
        {currentInterval && `${currentInterval.name}: ${formatTime(timerState.timeRemaining)} remaining`}
      </div>
    </div>
  );

  function getNextIntervalName(): string {
    if (!timerState.preset) return '';
    
    const nextIndex = timerState.currentIntervalIndex + 1;
    
    if (nextIndex < timerState.preset.intervals.length) {
      return timerState.preset.intervals[nextIndex].name;
    } else if (timerState.currentCycle + 1 < timerState.preset.cycles) {
      return timerState.preset.intervals[0].name;
    } else {
      return 'Finished';
    }
  }
};