export interface TimerInterval {
  id: string;
  name: string;
  duration: number; // seconds
  type: 'work' | 'rest' | 'warm' | 'cool';
  color?: string;
  audioCue?: 'beep' | 'bell' | 'start' | 'end' | 'none';
  voiceAnnouncement?: string;
}

export interface TimerPreset {
  id: string;
  name: string;
  description?: string;
  intervals: TimerInterval[];
  cycles: number;
  totalDuration: number; // calculated
  isBuiltIn?: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  isBreakMode: boolean;
  currentCycle: number;
  currentIntervalIndex: number;
  timeRemaining: number;
  totalElapsed: number;
  preset: TimerPreset | null;
}

export interface AudioSettings {
  volume: number; // 0-1
  isMuted: boolean;
  enableVoice: boolean;
  voiceRate: number;
  voicePitch: number;
}

export interface TimerSettings {
  colorBlindMode: boolean;
  lowPowerMode: boolean;
  audio: AudioSettings;
  keyboardShortcuts: boolean;
}

export type TimerAction = 
  | 'start'
  | 'pause' 
  | 'resume'
  | 'stop'
  | 'reset'
  | 'skip'
  | 'toggleBreak'
  | 'setPreset';

export interface TimerContextType {
  // State
  presets: TimerPreset[];
  activePreset: TimerPreset | null;
  timerState: TimerState;
  settings: TimerSettings;
  
  // Actions
  setActivePreset: (preset: TimerPreset) => void;
  savePreset: (preset: TimerPreset) => void;
  deletePreset: (id: string) => void;
  updateSettings: (settings: Partial<TimerSettings>) => void;
  
  // Timer controls (will be provided by useTimerEngine)
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  skip: () => void;
  toggleBreak: () => void;
}