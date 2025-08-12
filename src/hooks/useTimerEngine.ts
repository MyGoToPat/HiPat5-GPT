import { useEffect, useRef, useCallback, useState } from 'react';
import { TimerPreset, TimerState } from '../types/timer';
import { AudioService } from '../utils/AudioService';
import { useTimer } from '../context/TimerContext';

interface TimerEngineCallbacks {
  onTick?: (timeRemaining: number, totalElapsed: number) => void;
  onIntervalChange?: (intervalIndex: number, cycle: number) => void;
  onFinish?: () => void;
  onBreakModeChange?: (isBreakMode: boolean) => void;
}

export function useTimerEngine(preset: TimerPreset | null, callbacks: TimerEngineCallbacks = {}) {
  const { timerState, settings, updateSettings } = useTimer();
  const [localState, setLocalState] = useState<TimerState>(timerState);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const isHiddenRef = useRef<boolean>(false);

  // Track page visibility for low power mode
  useEffect(() => {
    const handleVisibilityChange = () => {
      isHiddenRef.current = document.hidden;
      if (settings.lowPowerMode && document.hidden) {
        // Switch to low frequency updates when hidden
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          startLowPowerTimer();
        }
      } else if (localState.isRunning && !localState.isPaused) {
        // Resume normal frequency when visible
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          startHighFrequencyTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings.lowPowerMode, localState.isRunning, localState.isPaused]);

  const getCurrentInterval = useCallback(() => {
    if (!preset || !preset.intervals.length) return null;
    return preset.intervals[localState.currentIntervalIndex % preset.intervals.length];
  }, [preset, localState.currentIntervalIndex]);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const playAudioCue = useCallback(async (type: 'beep' | 'start' | 'end' | 'bell') => {
    if (settings.audio.isMuted) return;
    await AudioService.playCue(type, settings.audio.volume);
  }, [settings.audio]);

  const announceText = useCallback((text: string) => {
    if (settings.audio.isMuted || !settings.audio.enableVoice) return;
    
    AudioService.speak(text, {
      rate: settings.audio.voiceRate,
      pitch: settings.audio.voicePitch,
      volume: settings.audio.volume
    });
  }, [settings.audio]);

  const tick = useCallback(() => {
    setLocalState(prevState => {
      if (!prevState.isRunning || prevState.isPaused || prevState.isBreakMode) {
        return prevState;
      }

      const newTimeRemaining = Math.max(0, prevState.timeRemaining - 1);
      const newTotalElapsed = prevState.totalElapsed + 1;

      // Call tick callback
      callbacks.onTick?.(newTimeRemaining, newTotalElapsed);

      // Check if current interval is complete
      if (newTimeRemaining === 0) {
        const currentInterval = getCurrentInterval();
        
        // Play audio cue for interval end
        if (currentInterval?.audioCue) {
          playAudioCue(currentInterval.audioCue);
        }

        // Move to next interval or cycle
        const nextIntervalIndex = prevState.currentIntervalIndex + 1;
        const isLastIntervalInCycle = preset && nextIntervalIndex >= preset.intervals.length;
        
        if (isLastIntervalInCycle) {
          const nextCycle = prevState.currentCycle + 1;
          
          // Check if all cycles are complete
          if (preset && nextCycle >= preset.cycles) {
            // Timer finished
            playAudioCue('end');
            announceText('Timer complete!');
            callbacks.onFinish?.();
            
            return {
              ...prevState,
              isRunning: false,
              timeRemaining: 0,
              totalElapsed: newTotalElapsed
            };
          } else {
            // Start next cycle
            const nextInterval = preset!.intervals[0];
            callbacks.onIntervalChange?.(0, nextCycle);
            
            if (nextInterval.voiceAnnouncement) {
              announceText(nextInterval.voiceAnnouncement);
            }
            
            return {
              ...prevState,
              currentCycle: nextCycle,
              currentIntervalIndex: 0,
              timeRemaining: nextInterval.duration,
              totalElapsed: newTotalElapsed
            };
          }
        } else {
          // Move to next interval in current cycle
          const nextInterval = preset!.intervals[nextIntervalIndex];
          callbacks.onIntervalChange?.(nextIntervalIndex, prevState.currentCycle);
          
          if (nextInterval.voiceAnnouncement) {
            announceText(nextInterval.voiceAnnouncement);
          }
          
          return {
            ...prevState,
            currentIntervalIndex: nextIntervalIndex,
            timeRemaining: nextInterval.duration,
            totalElapsed: newTotalElapsed
          };
        }
      }

      return {
        ...prevState,
        timeRemaining: newTimeRemaining,
        totalElapsed: newTotalElapsed
      };
    });
  }, [preset, getCurrentInterval, playAudioCue, announceText, callbacks]);

  const startHighFrequencyTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000);
  }, [tick]);

  const startLowPowerTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, 1000); // Still 1 second for accuracy
  }, [tick]);

  const start = useCallback(() => {
    if (!preset) return;
    
    const firstInterval = preset.intervals[0];
    if (!firstInterval) return;

    setLocalState({
      isRunning: true,
      isPaused: false,
      isBreakMode: false,
      currentCycle: 0,
      currentIntervalIndex: 0,
      timeRemaining: firstInterval.duration,
      totalElapsed: 0,
      preset
    });

    playAudioCue('start');
    if (firstInterval.voiceAnnouncement) {
      announceText(firstInterval.voiceAnnouncement);
    }

    callbacks.onIntervalChange?.(0, 0);
    
    if (settings.lowPowerMode && isHiddenRef.current) {
      startLowPowerTimer();
    } else {
      startHighFrequencyTimer();
    }
  }, [preset, playAudioCue, announceText, callbacks, settings.lowPowerMode, startHighFrequencyTimer, startLowPowerTimer]);

  const pause = useCallback(() => {
    setLocalState(prev => ({ ...prev, isPaused: true }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    setLocalState(prev => ({ ...prev, isPaused: false }));
    if (settings.lowPowerMode && isHiddenRef.current) {
      startLowPowerTimer();
    } else {
      startHighFrequencyTimer();
    }
  }, [settings.lowPowerMode, startHighFrequencyTimer, startLowPowerTimer]);

  const stop = useCallback(() => {
    setLocalState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      isBreakMode: false
    }));
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (!preset) return;
    
    const firstInterval = preset.intervals[0];
    setLocalState({
      isRunning: false,
      isPaused: false,
      isBreakMode: false,
      currentCycle: 0,
      currentIntervalIndex: 0,
      timeRemaining: firstInterval?.duration || 0,
      totalElapsed: 0,
      preset
    });

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [preset]);

  const skip = useCallback(() => {
    if (!preset || !localState.isRunning) return;
    
    const nextIntervalIndex = localState.currentIntervalIndex + 1;
    const isLastIntervalInCycle = nextIntervalIndex >= preset.intervals.length;
    
    if (isLastIntervalInCycle) {
      const nextCycle = localState.currentCycle + 1;
      
      if (nextCycle >= preset.cycles) {
        // Skip to end
        stop();
        callbacks.onFinish?.();
        return;
      } else {
        // Skip to next cycle
        const nextInterval = preset.intervals[0];
        setLocalState(prev => ({
          ...prev,
          currentCycle: nextCycle,
          currentIntervalIndex: 0,
          timeRemaining: nextInterval.duration
        }));
        callbacks.onIntervalChange?.(0, nextCycle);
      }
    } else {
      // Skip to next interval
      const nextInterval = preset.intervals[nextIntervalIndex];
      setLocalState(prev => ({
        ...prev,
        currentIntervalIndex: nextIntervalIndex,
        timeRemaining: nextInterval.duration
      }));
      callbacks.onIntervalChange?.(nextIntervalIndex, localState.currentCycle);
    }
  }, [preset, localState, stop, callbacks]);

  const toggleBreak = useCallback(() => {
    setLocalState(prev => {
      const newBreakMode = !prev.isBreakMode;
      
      if (newBreakMode && prev.isRunning) {
        // Entering break mode - announce remaining time
        const remainingTime = formatTime(prev.timeRemaining);
        announceText(`Machine occupied for ${remainingTime}`);
      }
      
      callbacks.onBreakModeChange?.(newBreakMode);
      
      return { ...prev, isBreakMode: newBreakMode };
    });
  }, [announceText, formatTime, callbacks]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!settings.keyboardShortcuts) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (localState.isRunning && !localState.isPaused) {
            pause();
          } else if (localState.isPaused) {
            resume();
          } else if (preset) {
            start();
          }
          break;
        
        case 'ArrowRight':
          event.preventDefault();
          skip();
          break;
        
        case 'KeyB':
          event.preventDefault();
          toggleBreak();
          break;
        
        case 'KeyR':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            reset();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [settings.keyboardShortcuts, localState, preset, pause, resume, start, skip, toggleBreak, reset]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    timerState: localState,
    currentInterval: getCurrentInterval(),
    start,
    pause,
    resume,
    stop,
    reset,
    skip,
    toggleBreak,
    formatTime
  };
}