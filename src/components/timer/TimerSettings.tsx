import React from 'react';
import { X, Volume2, VolumeX, Play, Palette, Keyboard, Battery, Eye } from 'lucide-react';
import { useTimer } from '../../context/TimerContext';
import { AudioService } from '../../utils/AudioService';

interface TimerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TimerSettings: React.FC<TimerSettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useTimer();

  if (!isOpen) return null;

  const handleVolumeChange = (volume: number) => {
    const newSettings = {
      ...settings,
      audio: { ...settings.audio, volume }
    };
    updateSettings(newSettings);
    AudioService.setMasterVolume(volume);
  };

  const handleMuteToggle = () => {
    const newSettings = {
      ...settings,
      audio: { ...settings.audio, isMuted: !settings.audio.isMuted }
    };
    updateSettings(newSettings);
  };

  const handlePreviewCue = async (type: 'beep' | 'bell' | 'start' | 'end') => {
    if (!settings.audio.isMuted) {
      await AudioService.previewCue(type);
    }
  };

  const handleColorBlindToggle = () => {
    updateSettings({ colorBlindMode: !settings.colorBlindMode });
  };

  const handleLowPowerToggle = () => {
    updateSettings({ lowPowerMode: !settings.lowPowerMode });
  };

  const handleKeyboardShortcutsToggle = () => {
    updateSettings({ keyboardShortcuts: !settings.keyboardShortcuts });
  };

  const handleVoiceToggle = () => {
    const newSettings = {
      ...settings,
      audio: { ...settings.audio, enableVoice: !settings.audio.enableVoice }
    };
    updateSettings(newSettings);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Settings Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Timer Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Audio Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Volume2 size={20} />
              Audio Settings
            </h3>
            
            <div className="space-y-4">
              {/* Master Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Master Volume
                  </label>
                  <button
                    onClick={handleMuteToggle}
                    className={`p-2 rounded-lg transition-colors ${
                      settings.audio.isMuted 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {settings.audio.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.audio.volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  disabled={settings.audio.isMuted}
                  className="w-full slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>{Math.round(settings.audio.volume * 100)}%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Audio Cue Previews */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Audio Cues
                </label>
                <div key="audio-cues-grid" className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'beep' as const, label: 'Beep' },
                    { type: 'bell' as const, label: 'Bell' },
                    { type: 'start' as const, label: 'Start' },
                    { type: 'end' as const, label: 'End' }
                  ].map(({ type, label }) => (
                    <button
                      key={type}
                      onClick={() => handlePreviewCue(type)}
                      disabled={settings.audio.isMuted}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
                    >
                      <Play size={12} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Announcements */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Voice Announcements</p>
                  <p className="text-xs text-gray-500">Spoken interval names and cues</p>
                </div>
                <button
                  onClick={handleVoiceToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.audio.enableVoice ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.audio.enableVoice ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Voice Settings */}
              {settings.audio.enableVoice && (
                <div className="pl-4 border-l-2 border-blue-200 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speech Rate: {settings.audio.voiceRate}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.audio.voiceRate}
                      onChange={(e) => updateSettings({
                        audio: { ...settings.audio, voiceRate: parseFloat(e.target.value) }
                      })}
                      className="w-full slider"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Speech Pitch: {settings.audio.voicePitch}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.audio.voicePitch}
                      onChange={(e) => updateSettings({
                        audio: { ...settings.audio, voicePitch: parseFloat(e.target.value) }
                      })}
                      className="w-full slider"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visual Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Palette size={20} />
              Visual Settings
            </h3>
            
            <div className="space-y-4">
              {/* Color Blind Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Color-Blind Friendly</p>
                  <p className="text-xs text-gray-500">High contrast blue/orange palette</p>
                </div>
                <button
                  onClick={handleColorBlindToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.colorBlindMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.colorBlindMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Color Preview */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="w-full h-8 timer-work rounded mb-1" />
                  <span className="text-xs text-gray-600">Work</span>
                </div>
                <div className="text-center">
                  <div className="w-full h-8 timer-rest rounded mb-1" />
                  <span className="text-xs text-gray-600">Rest</span>
                </div>
                <div className="text-center">
                  <div className="w-full h-8 timer-warm rounded mb-1" />
                  <span className="text-xs text-gray-600">Warm-up</span>
                </div>
                <div className="text-center">
                  <div className="w-full h-8 timer-cool rounded mb-1" />
                  <span className="text-xs text-gray-600">Cool-down</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Battery size={20} />
              Performance
            </h3>
            
            <div className="space-y-4">
              {/* Low Power Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Low Power Mode</p>
                  <p className="text-xs text-gray-500">Reduce frame rate when tab is hidden</p>
                </div>
                <button
                  onClick={handleLowPowerToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.lowPowerMode ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.lowPowerMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Accessibility Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye size={20} />
              Accessibility
            </h3>
            
            <div className="space-y-4">
              {/* Keyboard Shortcuts */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Keyboard Shortcuts</p>
                  <p className="text-xs text-gray-500">Enable Space, Arrow, and B key controls</p>
                </div>
                <button
                  onClick={handleKeyboardShortcutsToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.keyboardShortcuts ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.keyboardShortcuts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Keyboard Shortcuts Help */}
              {settings.keyboardShortcuts && (
                <div className="pl-4 border-l-2 border-blue-200">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div><kbd className="px-1 py-0.5 bg-gray-100 rounded">Space</kbd> Play/Pause</div>
                    <div><kbd className="px-1 py-0.5 bg-gray-100 rounded">→</kbd> Skip interval</div>
                    <div><kbd className="px-1 py-0.5 bg-gray-100 rounded">B</kbd> Toggle break mode</div>
                    <div><kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+R</kbd> Reset timer</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* About */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Interval Timer v1.0 • Built with React & Web Audio API
            </p>
          </div>
        </div>
      </div>
    </>
  );
};