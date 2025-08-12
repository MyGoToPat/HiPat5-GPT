import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { TimerPreset, TimerState, TimerSettings, TimerContextType } from '../types/timer';

// Built-in presets
const BUILT_IN_PRESETS: TimerPreset[] = [
  {
    id: 'tabata',
    name: 'Tabata 20/10',
    description: 'Classic Tabata: 20 seconds work, 10 seconds rest, 8 rounds',
    isBuiltIn: true,
    cycles: 8,
    totalDuration: 240,
    createdAt: new Date(),
    intervals: [
      {
        id: 'work',
        name: 'Work',
        duration: 20,
        type: 'work',
        audioCue: 'beep',
        voiceAnnouncement: 'Work'
      },
      {
        id: 'rest',
        name: 'Rest',
        duration: 10,
        type: 'rest',
        audioCue: 'bell',
        voiceAnnouncement: 'Rest'
      }
    ]
  },
  {
    id: 'emom',
    name: 'EMOM 60',
    description: 'Every Minute on the Minute for 10 minutes',
    isBuiltIn: true,
    cycles: 10,
    totalDuration: 600,
    createdAt: new Date(),
    intervals: [
      {
        id: 'work',
        name: 'Work',
        duration: 60,
        type: 'work',
        audioCue: 'start',
        voiceAnnouncement: 'Go'
      }
    ]
  },
  {
    id: 'sprint',
    name: '30-20-10 Sprint',
    description: 'Descending sprint intervals with equal rest',
    isBuiltIn: true,
    cycles: 3,
    totalDuration: 180,
    createdAt: new Date(),
    intervals: [
      {
        id: 'sprint1',
        name: 'Sprint 30s',
        duration: 30,
        type: 'work',
        audioCue: 'start',
        voiceAnnouncement: 'Sprint 30 seconds'
      },
      {
        id: 'rest1',
        name: 'Rest 30s',
        duration: 30,
        type: 'rest',
        audioCue: 'bell',
        voiceAnnouncement: 'Rest'
      },
      {
        id: 'sprint2',
        name: 'Sprint 20s',
        duration: 20,
        type: 'work',
        audioCue: 'start',
        voiceAnnouncement: 'Sprint 20 seconds'
      },
      {
        id: 'rest2',
        name: 'Rest 20s',
        duration: 20,
        type: 'rest',
        audioCue: 'bell',
        voiceAnnouncement: 'Rest'
      },
      {
        id: 'sprint3',
        name: 'Sprint 10s',
        duration: 10,
        type: 'work',
        audioCue: 'start',
        voiceAnnouncement: 'Sprint 10 seconds'
      },
      {
        id: 'rest3',
        name: 'Rest 10s',
        duration: 10,
        type: 'rest',
        audioCue: 'bell',
        voiceAnnouncement: 'Rest'
      }
    ]
  }
];

// Quick start preset
const QUICK_START_PRESET: TimerPreset = {
  id: 'quick-30-30',
  name: 'Quick 30/30',
  description: 'Quick start: 30 seconds work, 30 seconds rest, 4 rounds',
  isBuiltIn: true,
  cycles: 4,
  totalDuration: 240,
  createdAt: new Date(),
  intervals: [
    {
      id: 'work',
      name: 'Work',
      duration: 30,
      type: 'work',
      audioCue: 'beep',
      voiceAnnouncement: 'Work'
    },
    {
      id: 'rest',
      name: 'Rest',
      duration: 30,
      type: 'rest',
      audioCue: 'bell',
      voiceAnnouncement: 'Rest'
    }
  ]
};

const STORAGE_KEYS = {
  PRESETS: 'timer_presets',
  SETTINGS: 'timer_settings',
  ACTIVE_PRESET: 'timer_active_preset',
  TIMER_STATE: 'timer_state'
};

const initialTimerState: TimerState = {
  isRunning: false,
  isPaused: false,
  isBreakMode: false,
  currentCycle: 0,
  currentIntervalIndex: 0,
  timeRemaining: 0,
  totalElapsed: 0,
  preset: null
};

const initialSettings: TimerSettings = {
  colorBlindMode: false,
  lowPowerMode: false,
  keyboardShortcuts: true,
  audio: {
    volume: 0.7,
    isMuted: false,
    enableVoice: true,
    voiceRate: 1.0,
    voicePitch: 1.0
  }
};

interface TimerContextState {
  presets: TimerPreset[];
  activePreset: TimerPreset | null;
  timerState: TimerState;
  settings: TimerSettings;
}

type TimerAction = 
  | { type: 'SET_PRESETS'; payload: TimerPreset[] }
  | { type: 'ADD_PRESET'; payload: TimerPreset }
  | { type: 'UPDATE_PRESET'; payload: TimerPreset }
  | { type: 'DELETE_PRESET'; payload: string }
  | { type: 'SET_ACTIVE_PRESET'; payload: TimerPreset | null }
  | { type: 'SET_TIMER_STATE'; payload: Partial<TimerState> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<TimerSettings> }
  | { type: 'LOAD_FROM_STORAGE'; payload: TimerContextState };

function timerReducer(state: TimerContextState, action: TimerAction): TimerContextState {
  switch (action.type) {
    case 'SET_PRESETS':
      return { ...state, presets: action.payload };
    
    case 'ADD_PRESET':
      return { ...state, presets: [...state.presets, action.payload] };
    
    case 'UPDATE_PRESET':
      return {
        ...state,
        presets: state.presets.map(p => p.id === action.payload.id ? action.payload : p)
      };
    
    case 'DELETE_PRESET':
      return {
        ...state,
        presets: state.presets.filter(p => p.id !== action.payload)
      };
    
    case 'SET_ACTIVE_PRESET':
      return { ...state, activePreset: action.payload };
    
    case 'SET_TIMER_STATE':
      return { ...state, timerState: { ...state.timerState, ...action.payload } };
    
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    
    case 'LOAD_FROM_STORAGE':
      return action.payload;
    
    default:
      return state;
  }
}

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(timerReducer, {
    presets: BUILT_IN_PRESETS,
    activePreset: null,
    timerState: initialTimerState,
    settings: initialSettings
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem(STORAGE_KEYS.PRESETS);
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const savedActivePreset = localStorage.getItem(STORAGE_KEYS.ACTIVE_PRESET);
      const savedTimerState = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);

      const loadedState: TimerContextState = {
        presets: savedPresets ? [...BUILT_IN_PRESETS, ...JSON.parse(savedPresets)] : BUILT_IN_PRESETS,
        activePreset: savedActivePreset ? JSON.parse(savedActivePreset) : null,
        timerState: savedTimerState ? { ...initialTimerState, ...JSON.parse(savedTimerState) } : initialTimerState,
        settings: savedSettings ? { ...initialSettings, ...JSON.parse(savedSettings) } : initialSettings
      };

      dispatch({ type: 'LOAD_FROM_STORAGE', payload: loadedState });
    } catch (error) {
      console.error('Failed to load timer data from localStorage:', error);
    }
  }, []);

  // Save to localStorage on state changes
  useEffect(() => {
    try {
      const userPresets = state.presets.filter(p => !p.isBuiltIn);
      localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(userPresets));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
      
      if (state.activePreset) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PRESET, JSON.stringify(state.activePreset));
      }
      
      localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(state.timerState));
    } catch (error) {
      console.error('Failed to save timer data to localStorage:', error);
    }
  }, [state]);

  // Apply color blind mode to document
  useEffect(() => {
    if (state.settings.colorBlindMode) {
      document.documentElement.setAttribute('data-theme', 'colorblind');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [state.settings.colorBlindMode]);

  const contextValue: TimerContextType = {
    ...state,
    setActivePreset: (preset) => dispatch({ type: 'SET_ACTIVE_PRESET', payload: preset }),
    savePreset: (preset) => {
      if (state.presets.find(p => p.id === preset.id)) {
        dispatch({ type: 'UPDATE_PRESET', payload: preset });
      } else {
        dispatch({ type: 'ADD_PRESET', payload: preset });
      }
    },
    deletePreset: (id) => dispatch({ type: 'DELETE_PRESET', payload: id }),
    updateSettings: (settings) => dispatch({ type: 'UPDATE_SETTINGS', payload: settings }),
    
    // Timer controls - these will be overridden by useTimerEngine
    start: () => {},
    pause: () => {},
    resume: () => {},
    stop: () => {},
    reset: () => {},
    skip: () => {},
    toggleBreak: () => {}
  };

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}

// Utility functions for preset sharing
export function exportPreset(preset: TimerPreset): string {
  const exportData = {
    ...preset,
    id: crypto.randomUUID(), // Generate new ID for imported preset
    isBuiltIn: false,
    createdAt: new Date()
  };
  return btoa(JSON.stringify(exportData));
}

export function importPreset(encodedPreset: string): TimerPreset | null {
  try {
    const preset = JSON.parse(atob(encodedPreset));
    // Validate preset structure
    if (preset.name && preset.intervals && Array.isArray(preset.intervals)) {
      return {
        ...preset,
        id: crypto.randomUUID(),
        isBuiltIn: false,
        createdAt: new Date()
      };
    }
  } catch (error) {
    console.error('Failed to import preset:', error);
  }
  return null;
}

// Quick start function
export function getQuickStartPreset(): TimerPreset {
  return { ...QUICK_START_PRESET, id: crypto.randomUUID() };
}