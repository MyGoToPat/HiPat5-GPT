import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, X, Play, Palette } from 'lucide-react';
import { TimerPreset, TimerInterval } from '../../types/timer';

interface IntervalDesignerProps {
  preset: TimerPreset | null;
  onSave: (preset: TimerPreset) => void;
  onCancel: () => void;
}

const INTERVAL_TYPES = [
  { value: 'warm', label: 'Warm-up', color: 'bg-blue-500', description: 'Preparation phase' },
  { value: 'work', label: 'Work', color: 'bg-green-500', description: 'High intensity' },
  { value: 'rest', label: 'Rest', color: 'bg-red-500', description: 'Recovery phase' },
  { value: 'cool', label: 'Cool-down', color: 'bg-purple-500', description: 'Recovery phase' }
] as const;

const AUDIO_CUES = [
  { value: 'none', label: 'None' },
  { value: 'beep', label: 'Beep' },
  { value: 'bell', label: 'Bell' },
  { value: 'start', label: 'Start Sound' },
  { value: 'end', label: 'End Sound' }
] as const;

export const IntervalDesigner: React.FC<IntervalDesignerProps> = ({
  preset,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cycles, setCycles] = useState(1);
  const [intervals, setIntervals] = useState<TimerInterval[]>([]);

  useEffect(() => {
    if (preset) {
      setName(preset.name);
      setDescription(preset.description || '');
      setCycles(preset.cycles);
      setIntervals(preset.intervals.map(interval => ({ ...interval })));
    } else {
      // New preset defaults
      setName('');
      setDescription('');
      setCycles(1);
      setIntervals([
        {
          id: crypto.randomUUID(),
          name: 'Work',
          duration: 30,
          type: 'work',
          audioCue: 'beep',
          voiceAnnouncement: 'Work'
        },
        {
          id: crypto.randomUUID(),
          name: 'Rest',
          duration: 30,
          type: 'rest',
          audioCue: 'bell',
          voiceAnnouncement: 'Rest'
        }
      ]);
    }
  }, [preset]);

  const calculateTotalDuration = () => {
    const intervalDuration = intervals.reduce((sum, interval) => sum + interval.duration, 0);
    return intervalDuration * cycles;
  };

  const addInterval = () => {
    const newInterval: TimerInterval = {
      id: crypto.randomUUID(),
      name: 'New Interval',
      duration: 30,
      type: 'work',
      audioCue: 'beep',
      voiceAnnouncement: ''
    };
    setIntervals([...intervals, newInterval]);
  };

  const updateInterval = (index: number, updates: Partial<TimerInterval>) => {
    const newIntervals = [...intervals];
    newIntervals[index] = { ...newIntervals[index], ...updates };
    setIntervals(newIntervals);
  };

  const removeInterval = (index: number) => {
    if (intervals.length > 1) {
      setIntervals(intervals.filter((_, i) => i !== index));
    }
  };

  const moveInterval = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < intervals.length) {
      const newIntervals = [...intervals];
      [newIntervals[index], newIntervals[newIndex]] = [newIntervals[newIndex], newIntervals[index]];
      setIntervals(newIntervals);
    }
  };

  const handleSave = () => {
    if (!name.trim() || intervals.length === 0) return;

    const savedPreset: TimerPreset = {
      id: preset?.id || crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      intervals,
      cycles,
      totalDuration: calculateTotalDuration(),
      isBuiltIn: false,
      createdAt: preset?.createdAt || new Date(),
      lastUsed: preset?.lastUsed
    };

    onSave(savedPreset);
  };

  const getTypeColor = (type: TimerInterval['type']) => {
    return INTERVAL_TYPES.find(t => t.value === type)?.color || 'bg-gray-500';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {preset?.id ? 'Edit Preset' : 'Create New Preset'}
        </h2>
        <p className="text-gray-600">
          Design your custom interval timer with work, rest, and transition periods
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preset Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My HIIT Workout"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cycles
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={cycles}
                onChange={(e) => setCycles(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this timer preset"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Intervals */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Intervals</h3>
            <button
              onClick={addInterval}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add Interval
            </button>
          </div>

          <div className="space-y-4">
            {intervals.map((interval, index) => (
              <div
                key={interval.id}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-4 h-4 rounded-full ${getTypeColor(interval.type)}`} />
                  <span className="font-medium text-gray-900">Interval {index + 1}</span>
                  
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => moveInterval(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveInterval(index, 'down')}
                      disabled={index === intervals.length - 1}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeInterval(index)}
                      disabled={intervals.length <= 1}
                      className="p-1 hover:bg-red-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={interval.name}
                      onChange={(e) => updateInterval(index, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" // eslint-disable-next-line react/jsx-key
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (seconds)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="3600"
                      value={interval.duration}
                      onChange={(e) => updateInterval(index, { duration: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" // eslint-disable-next-line react/jsx-key
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={interval.type}
                      onChange={(e) => updateInterval(index, { type: e.target.value as TimerInterval['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" // eslint-disable-next-line react/jsx-key
                    >
                      {INTERVAL_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Audio Cue
                    </label>
                    <select
                      value={interval.audioCue || 'none'}
                      onChange={(e) => updateInterval(index, { audioCue: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" // eslint-disable-next-line react/jsx-key
                    >
                      {AUDIO_CUES.map((cue) => (
                        <option key={cue.value} value={cue.value}>
                          {cue.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voice Announcement
                  </label>
                  <input
                    type="text"
                    value={interval.voiceAnnouncement || ''}
                    onChange={(e) => updateInterval(index, { voiceAnnouncement: e.target.value })}
                    placeholder="e.g., 'Work hard' or 'Take a break'"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatTime(calculateTotalDuration())}</div>
              <div className="text-sm text-gray-600">Total Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{cycles}</div>
              <div className="text-sm text-gray-600">Cycles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{intervals.length}</div>
              <div className="text-sm text-gray-600">Intervals per Cycle</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {intervals.map((interval, index) => (
              <div
                key={interval.id}
                className={`px-3 py-2 rounded-lg text-white text-sm font-medium ${getTypeColor(interval.type)}`}
              >
                {interval.name} ({interval.duration}s)
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 bg-white">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <X size={16} />
          Cancel
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!name.trim() || intervals.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <Save size={16} />
            Save Preset
          </button>
        </div>
      </div>
    </div>
  );
};