import React from 'react';
import { Play, Pause, Square, SkipForward, RotateCcw, Coffee, ArrowLeft } from 'lucide-react';

interface TimerControlsProps {
  timerEngine: any;
  onBack: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  timerEngine,
  onBack
}) => {
  const { timerState, start, pause, resume, stop, reset, skip, toggleBreak } = timerEngine;

  const handlePlayPause = () => {
    if (!timerState.isRunning) {
      start();
    } else if (timerState.isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const getPlayPauseIcon = () => {
    if (!timerState.isRunning || timerState.isPaused) {
      return <Play size={24} />;
    }
    return <Pause size={24} />;
  };

  const getPlayPauseLabel = () => {
    if (!timerState.isRunning) return 'Start';
    if (timerState.isPaused) return 'Resume';
    return 'Pause';
  };

  return (
    <div className="bg-white border-t border-gray-200 p-6">
      {/* Primary Controls */}
      <div className="flex items-center justify-center gap-4 mb-4">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="p-3 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Back to presets"
        >
          <ArrowLeft size={24} className="text-gray-600" />
        </button>

        {/* Reset */}
        <button
          onClick={reset}
          disabled={!timerState.preset}
          className="p-3 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Reset timer"
        >
          <RotateCcw size={24} className="text-gray-600" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          disabled={!timerState.preset}
          className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors shadow-lg"
          aria-label={getPlayPauseLabel()}
        >
          {getPlayPauseIcon()}
        </button>

        {/* Skip */}
        <button
          onClick={skip}
          disabled={!timerState.isRunning}
          className="p-3 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Skip to next interval"
        >
          <SkipForward size={24} className="text-gray-600" />
        </button>

        {/* Stop */}
        <button
          onClick={stop}
          disabled={!timerState.isRunning && !timerState.isPaused}
          className="p-3 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Stop timer"
        >
          <Square size={24} className="text-gray-600" />
        </button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Break Mode Toggle */}
        <button
          onClick={toggleBreak}
          disabled={!timerState.isRunning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            timerState.isBreakMode
              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          aria-label={timerState.isBreakMode ? 'Exit break mode' : 'Enter break mode'}
        >
          <Coffee size={16} />
          {timerState.isBreakMode ? 'Exit Break' : 'Break Mode'}
        </button>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Keyboard: <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Space</kbd> Play/Pause • 
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs mx-1">→</kbd> Skip • 
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">B</kbd> Break
        </p>
      </div>
    </div>
  );
};